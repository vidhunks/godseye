import json
import os
import subprocess
import requests
import sys
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.governance.database import neo4j
from app.services.neo4j_service import neo4j_service

router = APIRouter(
    prefix="/governance",
    tags=["Governance"],
)


class PolicyItem(BaseModel):
    policy_id: str
    name: str
    agent: str
    description: Optional[str] = ""


class PolicyDocument(BaseModel):
    policies: list[PolicyItem]


class RunAgentPayload(BaseModel):
    agent_name: str
    prompt: str
    user: Optional[str] = "Admin"
    role: Optional[str] = "ADMIN"


@router.post("/policy")
def ingest_policy(doc: PolicyDocument):

    results = []

    for item in doc.policies:
        neo4j_service.create_policy(
            policy_id=item.policy_id,
            name=item.name,
            description=item.description,
        )
        neo4j_service.link_agent_to_policy(
            agent_name=item.agent,
            policy_id=item.policy_id,
        )
        results.append(
            {
                "policy_id": item.policy_id,
                "agent": item.agent,
                "linked": True,
            }
        )

    return {
        "status": "success",
        "message": f"Successfully ingested {len(doc.policies)} policy rules.",
        "results": results,
    }


@router.get("/queries/{query_name}")
def run_governance_query(
    query_name: str,
    tool_name: Optional[str] = Query(None, description="Target tool or server name for blast_radius"),
):

    with neo4j.driver.session() as session:

        if query_name == "orphan_agents":
            cypher = """
            MATCH (a:Agent)
            WHERE NOT (a)-[:HAS_POLICY]->(:Policy)
            RETURN a.name AS agent
            """
            result = session.run(cypher)
            records = [r["agent"] for r in result]
            return {
                "query": "orphan_agents",
                "description": "Find agents with no policy attached.",
                "data": records,
            }

        elif query_name == "datasource_access":
            cypher = """
            MATCH (a:Agent)-[:USES]->(p:Proxy)-[:CONNECTS_TO]->(m:MCPServer)-[:EXPOSES]->(t:Tool)-[:ACCESSES]->(d:DataSource)
            RETURN a.name AS agent, d.name AS datasource, t.name AS tool
            """
            result = session.run(cypher)
            records = [
                {
                    "agent": r["agent"],
                    "datasource": r["datasource"],
                    "tool": r["tool"],
                }
                for r in result
            ]
            return {
                "query": "datasource_access",
                "description": "Find data sources accessed by each agent.",
                "data": records,
            }

        elif query_name == "blast_radius":
            if not tool_name:
                raise HTTPException(
                    status_code=400,
                    detail="tool_name query parameter is required for blast_radius query.",
                )

            cypher = """
            // Find the target node (Tool, MCPServer, or DataSource)
            MATCH (target)
            WHERE (target:Tool AND target.name = $tool_name) 
               OR (target:MCPServer AND target.name = $tool_name)
               OR (target:DataSource AND target.name = $tool_name)
            
            // Check if the target itself OR its parent server is HIGH risk
            OPTIONAL MATCH (target)-[:HAS_RISK]->(r1:RiskAssessment)
            OPTIONAL MATCH (target)<-[:EXPOSES]-(m1:MCPServer)-[:HAS_RISK]->(r2:RiskAssessment)
            OPTIONAL MATCH (target)<-[:ACCESSES]-(:Tool)<-[:EXPOSES]-(m2:MCPServer)-[:HAS_RISK]->(r3:RiskAssessment)
            
            WITH target, coalesce(r1.level, r2.level, r3.level) AS risk_level
            WHERE risk_level = "HIGH"
            
            // Traverse all paths from any User node to the high-risk target (up to 8 hops)
            OPTIONAL MATCH path = (u:User)-[*1..8]->(target)
            WITH path WHERE path IS NOT NULL
            RETURN DISTINCT [node in nodes(path) | {name: coalesce(node.name, node.uri, 'Unknown'), type: labels(node)[0]}] AS hops
            """
            result = session.run(cypher, tool_name=tool_name)
            
            paths_list = []
            for r in result:
                if r["hops"] and all(node is not None for node in r["hops"]):
                    paths_list.append(r["hops"])
                    
            return {
                "query": "blast_radius",
                "description": f"Compute blast radius compromised path hops for: {tool_name}",
                "data": paths_list,
            }

        else:
            raise HTTPException(
                status_code=404,
                detail=f"Unknown governance query: {query_name}. Available queries: orphan_agents, datasource_access, blast_radius",
            )


@router.get("/check-risk")
def check_risk(server: str):
    """
    Check if the server is high risk from the Neo4j database posture.
    If no risk assessment has been performed yet, trigger the scan dynamically.
    """
    # 1. Check if risk assessment already exists in DB
    cypher = """
    MATCH (m:MCPServer {uri: $server})-[:HAS_RISK]->(r:RiskAssessment)
    RETURN r.level AS level, r.score AS score
    """
    with neo4j.driver.session() as session:
        result = session.run(cypher, server=server)
        record = result.single()
        if record:
            return {
                "server": server,
                "level": record["level"],
                "score": record["score"],
            }

    # 2. If not found, trigger the dynamic on-demand scan!
    brain_config_path = "../sample_agents/brain_agent/agent_config.json"
    try:
        with open(brain_config_path, "r", encoding="utf-8") as f:
            brain_config = json.load(f)
        managed_folders = brain_config["managed_agents"]

        matching_server_conf = None
        matched_folder = None

        for folder in managed_folders:
            agent_config_path = f"../sample_agents/{folder}/agent_config.json"
            if os.path.exists(agent_config_path):
                with open(agent_config_path, "r", encoding="utf-8") as f:
                    agent_config = json.load(f)
                for server_conf in agent_config.get("mcpServers", []):
                    if server_conf["name"] == server:
                        matching_server_conf = server_conf
                        matched_folder = folder
                        break
                if matching_server_conf:
                    break

        if matching_server_conf:
            # Resolve paths
            args_resolved = []
            for arg in matching_server_conf.get("args", []):
                if "server.py" in arg:
                    mcp_servers_idx = arg.find("mcp_servers")
                    if mcp_servers_idx != -1:
                        subpath = arg[mcp_servers_idx:]
                        abs_path = os.path.abspath(os.path.join("..", subpath))
                    else:
                        abs_path = os.path.abspath(
                            os.path.join(
                                "../sample_agents",
                                matched_folder,
                                arg,
                            )
                        )
                    args_resolved.append(abs_path)
                else:
                    args_resolved.append(arg)

            server_resolved = {
                "name": matching_server_conf["name"],
                "transport": matching_server_conf["transport"],
                "command": matching_server_conf["command"],
                "args": args_resolved,
            }

            from app.scanner.scanner import scanner
            from app.risk.risk_engine import risk_engine

            # Perform scan & evaluate risk
            scan = scanner.scan(server_resolved)
            risk = risk_engine.evaluate(scan)

            # Persist to Neo4j
            neo4j_service.create_mcp_server(scan.server)
            for tool in scan.tools:
                neo4j_service.create_tool(scan.uri, tool)
            neo4j_service.create_risk_assessment(scan.uri, risk)

            return {
                "server": server,
                "level": risk["level"],
                "score": risk["score"],
            }
    except Exception as e:
        print("Dynamic risk check evaluation failed:", e)

    return {"server": server, "level": "LOW", "score": 0}


@router.get("/graph-data")
def get_graph_data():
    """
    Returns vis-network compatible nodes and edges from the active database.
    Highlights the last execution path and includes server risk ratings.
    """
    nodes_query = """
    MATCH (n)
    OPTIONAL MATCH (n)-[:HAS_RISK]->(r:RiskAssessment)
    RETURN id(n) AS id, labels(n)[0] AS label, properties(n) AS props, r.level AS risk_level
    """
    edges_query = """
    MATCH (n)-[r]->(m)
    RETURN id(n) AS source, id(m) AS target, type(r) AS type, properties(r) AS props
    """
    
    # Query last active execution path nodes
    last_call_query = """
    MATCH (m:MCPServer)-[c:CALLS]->(t:Tool)
    WITH m, t, c ORDER BY c.timestamp DESC LIMIT 1
    MATCH path = (u:User)-[*0..6]->(m)
    RETURN id(t) AS tool_id, [node in nodes(path) | id(node)] AS node_ids
    """

    with neo4j.driver.session() as session:
        last_res = session.run(last_call_query)
        last_path_nodes = set()
        for r in last_res:
            last_path_nodes.add(r["tool_id"])
            for nid in r["node_ids"]:
                last_path_nodes.add(nid)

        nodes_res = session.run(nodes_query)
        edges_res = session.run(edges_query)

        nodes = []
        for r in nodes_res:
            label = r["props"].get("name", r["props"].get("uri", r["label"]))
            props = r["props"]
            if r["risk_level"]:
                props["risk_level"] = r["risk_level"]
                
            nodes.append(
                {
                    "id": r["id"],
                    "label": label,
                    "group": r["label"],
                    "properties": props,
                    "is_last_path": r["id"] in last_path_nodes
                }
            )

        edges = []
        for r in edges_res:
            is_last_path = r["source"] in last_path_nodes and r["target"] in last_path_nodes
            edges.append(
                {
                    "from": r["source"],
                    "to": r["target"],
                    "label": r["type"],
                    "properties": r["props"],
                    "is_last_path": is_last_path
                }
            )

    return {"nodes": nodes, "edges": edges}


def select_agent_preflight(prompt: str) -> Optional[str]:
    groq_key = os.getenv("GROK_API_KEY") or os.getenv("GROQ_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    if groq_key or openai_key:
        system_prompt = (
            "You are an intelligent agent router for the GodsEye platform.\n"
            "Your job is to read a user request and select the most appropriate agent from the following list:\n"
            "- \"Finance Agent\"\n"
            "- \"HR Agent\"\n"
            "- \"DevOps Agent\"\n\n"
            "Respond with ONLY the name of the selected agent or \"None\"."
        )
        try:
            if groq_key:
                resp = requests.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
                    json={"model": "llama-3.3-70b-versatile", "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": prompt}], "temperature": 0.0},
                    timeout=5
                )
                if resp.status_code == 200:
                    clean = resp.json()["choices"][0]["message"]["content"].replace('"', '').replace("'", "").strip()
                    if clean in ["Finance Agent", "HR Agent", "DevOps Agent"]:
                        return clean
                else:
                    err_msg = resp.json().get('error', {}).get('message', resp.text)
                    print(f"[LLM Router] Groq API error {resp.status_code}: {err_msg}")
            elif openai_key:
                resp = requests.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"},
                    json={"model": "gpt-4o-mini", "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": prompt}], "temperature": 0.0},
                    timeout=5
                )
                if resp.status_code == 200:
                    clean = resp.json()["choices"][0]["message"]["content"].replace('"', '').replace("'", "").strip()
                    if clean in ["Finance Agent", "HR Agent", "DevOps Agent"]:
                        return clean
        except Exception:
            pass

    # Keyword fallback
    request = prompt.lower()
    if any(word in request for word in ["finance", "budget", "invoice", "report"]):
        return "Finance Agent"
    if any(word in request for word in ["employee", "leave", "salary", "hr"]):
        return "HR Agent"
    if any(word in request for word in ["server", "docker", "deployment", "cpu", "shell", "restart", "deploy", "log"]):
        return "DevOps Agent"
    return None


@router.post("/run-agent")
def run_agent(payload: RunAgentPayload):
    """
    Spawns Brain Agent CLI, feeds the prompt, and returns the output.
    Before executing, performs a pre-flight HIGH risk check against the governance
    graph. If the routed agent (or any agent it orchestrates) reaches a HIGH risk
    server, execution is blocked immediately and no subprocess is spawned.
    """
    # 1. Resolve agent beforehand
    agent_name = select_agent_preflight(payload.prompt)
    if not agent_name:
        agent_name = "Brain Agent"

    # ---------------------------------------------------------------
    # PRE-FLIGHT RISK CHECK
    # Query Neo4j for any HIGH risk servers in the selected agent's path
    # ---------------------------------------------------------------
    risk_check_cypher = """
    MATCH (a:Agent {name: $agent_name})-[:USES|ORCHESTRATES*0..4]->(p:Proxy)-[:CONNECTS_TO]->(m:MCPServer)-[:HAS_RISK]->(r:RiskAssessment)
    WHERE r.level = "HIGH"
    RETURN DISTINCT m.name AS server, r.score AS score
    """
    high_risk_servers = []
    try:
        with neo4j.driver.session() as session:
            result = session.run(risk_check_cypher, agent_name=agent_name)
            for record in result:
                high_risk_servers.append({
                    "server": record["server"],
                    "score": record["score"],
                })
    except Exception as e:
        # If DB is not reachable, log but don't block execution
        print(f"Risk pre-check DB query failed (non-blocking): {e}")

    if high_risk_servers:
        return {
            "status": "blocked",
            "stdout": (
                f"⛔ TASK NOT EXECUTED — HIGH RISK SERVER DETECTED\n\n"
                f"GodsEye Policy Engine has blocked this task before execution.\n\n"
                f"Reason: The target agent ({agent_name}) requires access to high-risk servers:\n"
                + "\n".join(
                    f"  • {s['server']}  [Risk Score: {s['score']}/100]"
                    for s in high_risk_servers
                )
                + "\n\n"
                f"Action Required: Remediate the server(s) listed above and re-run "
                f"the compliance scan before retrying task execution.\n"
            ),
            "stderr": "",
            "blocked_servers": high_risk_servers,
        }

    # ---------------------------------------------------------------
    # EXECUTION — only reached if all servers are LOW/MEDIUM risk
    # ---------------------------------------------------------------
    brain_agent_dir = os.path.abspath("../sample_agents/brain_agent")

    cmd = [sys.executable, "main.py"]

    # Pass pre-selected agent to subprocess env to prevent duplicate token usage
    env = os.environ.copy()
    env["PRE_SELECTED_AGENT"] = agent_name

    try:
        proc = subprocess.Popen(
            cmd,
            cwd=brain_agent_dir,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env,
            text=True,
        )

        stdout, stderr = proc.communicate(
            input=payload.prompt + "\n",
            timeout=15,
        )

        return {
            "status": (
                "success"
                if proc.returncode == 0
                else "error"
            ),
            "stdout": stdout,
            "stderr": stderr,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to execute agent prompt: {str(e)}",
        )



@router.get("/opa-policy")
def generate_opa_policy():
    """
    Generate an OPA Rego policy stub using an LLM.
    If no LLM key is configured, fallback to generating the static risk-based Rego policy.
    """
    # 1. Fetch server inventory data
    try:
        servers = get_server_inventory()
    except Exception as e:
        print(f"Failed to fetch server inventory for OPA generation: {e}")
        servers = []

    # 2. Prepare LLM prompt
    server_data_json = json.dumps(servers, indent=2)

    system_prompt = (
        "You are an expert security policy architect specializing in Open Policy Agent (OPA).\n"
        "You will be given a list of MCP (Model Context Protocol) servers, their risk levels/scores, and exposed tools.\n"
        "Generate a valid OPA Rego policy document in the package `mcp.authz` that enforces network and tool compliance.\n\n"
        "The Rego policy must satisfy these requirements:\n"
        "1. Define a default deny rule: `default allow = false`.\n"
        "2. Allow tool execution if the server is NOT high risk, OR write conditional rules for specific roles/tools.\n"
        "3. Explicitly define a helper rule or list `is_high_risk_server` containing all high-risk servers.\n"
        "4. Include custom rule logic restricting high-impact categories (like 'DELETE', 'EXECUTE', 'WRITE') or high-risk tools based on the user's role (e.g. restrict to 'ADMIN' or 'MANAGER').\n"
        "5. ONLY return the plain Rego code itself. Do not wrap it in markdown code blocks like ```rego or include any extra text or explanations. Start immediately with the package statement."
    )

    prompt = f"Input Server Inventory:\n{server_data_json}"

    rego_stub = ""
    groq_key = os.getenv("GROK_API_KEY") or os.getenv("GROQ_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    if groq_key or openai_key:
        print("[LLM OPA Generator] Calling LLM to generate Rego policy...")
        try:
            if groq_key:
                url = "https://api.groq.com/openai/v1/chat/completions"
                headers = {
                    "Authorization": f"Bearer {groq_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "llama-3.3-70b-versatile",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.1
                }
                resp = requests.post(url, json=payload, headers=headers, timeout=12)
                if resp.status_code == 200:
                    rego_stub = resp.json()["choices"][0]["message"]["content"].strip()
                else:
                    err_msg = resp.json().get('error', {}).get('message', resp.text)
                    print(f"[LLM OPA Generator] Groq API error {resp.status_code}: {err_msg}")
            elif openai_key:
                url = "https://api.openai.com/v1/chat/completions"
                headers = {
                    "Authorization": f"Bearer {openai_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.1
                }
                resp = requests.post(url, json=payload, headers=headers, timeout=12)
                if resp.status_code == 200:
                    rego_stub = resp.json()["choices"][0]["message"]["content"].strip()
                else:
                    err_msg = resp.json().get('error', {}).get('message', resp.text)
                    print(f"[LLM OPA Generator] OpenAI API error {resp.status_code}: {err_msg}")
        except Exception as e:
            print(f"[LLM OPA Generator] LLM API call failed: {e}")

    # Remove markdown code block wrapping if the LLM returned it anyway
    if rego_stub.startswith("```"):
        lines = rego_stub.split("\n")
        filtered_lines = [l for l in lines if not l.strip().startswith("```")]
        rego_stub = "\n".join(filtered_lines).strip()

    # Extract high-risk servers for response metadata
    high_risk_servers = [srv["server_name"] for srv in servers if srv.get("risk_level") == "HIGH"]

    # 3. Fallback to static rule-based policy if LLM generation was not used or failed
    if not rego_stub:
        if grok_key or openai_key:
            print("[LLM OPA Generator] LLM policy generation failed. Falling back to rule-based...")
        else:
            print("[LLM OPA Generator (Rule-based Fallback)] No API key found. Using static generator...")

        if not high_risk_servers:
            server_checks = '  server == "None"'
        else:
            server_checks = "\n".join(
                f'  server == "{s}"' for s in high_risk_servers
            )

        rego_stub = f"""package mcp.authz

# By default, deny access
default allow = false

# Allow tool execution if the server is NOT flagged as high risk
allow {{
  input.action == "call_tool"
  not is_high_risk_server(input.mcp_server)
}}

is_high_risk_server(server) {{
# High-risk servers identified by GodsEye:
{server_checks}
}}
"""

    return {
        "status": "success",
        "servers_blocked": high_risk_servers,
        "opa_policy": rego_stub,
    }


@router.get("/risk-cards")
def get_risk_cards():
    """
    Retrieve all calculated risk assessments from the Neo4j database.
    """
    cypher = """
    MATCH (m:MCPServer)-[:HAS_RISK]->(r:RiskAssessment)
    RETURN m.name AS server, m.owner AS owner, r.level AS level, r.score AS score, r.findings AS findings, r.recommendations AS recommendations
    """
    with neo4j.driver.session() as session:
        result = session.run(cypher)
        cards = []
        for r in result:
            cards.append({
                "server": r["server"],
                "owner": r["owner"] or "Unknown",
                "level": r["level"],
                "score": r["score"],
                "findings": r["findings"] or [],
                "recommendations": r["recommendations"] or [],
            })
        return cards


@router.get("/server-inventory")
def get_server_inventory():
    """
    Returns full metadata for every discovered MCP server along with
    all tools it exposes, their categories, permissions, risk tags, and
    the data sources each tool accesses.
    """
    cypher = """
    MATCH (m:MCPServer)
    OPTIONAL MATCH (m)-[:HAS_RISK]->(r:RiskAssessment)
    OPTIONAL MATCH (m)-[:EXPOSES]->(t:Tool)
    OPTIONAL MATCH (t)-[:ACCESSES]->(d:DataSource)
    RETURN
        m.name            AS server_name,
        m.version         AS version,
        m.department      AS department,
        m.owner           AS owner,
        m.environment     AS environment,
        m.transport       AS transport,
        m.auth_required   AS auth_required,
        m.auth_type       AS auth_type,
        m.public_exposed  AS public_exposed,
        m.tls_enabled     AS tls_enabled,
        m.audit_enabled   AS audit_enabled,
        r.level           AS risk_level,
        r.score           AS risk_score,
        collect(DISTINCT {
            name:        t.name,
            category:    t.category,
            permission:  t.permission,
            risk:        t.risk,
            resource:    t.resource,
            description: t.description,
            datasource:  d.name
        }) AS tools
    ORDER BY m.name
    """
    with neo4j.driver.session() as session:
        result = session.run(cypher)
        servers = []
        for r in result:
            # Filter out null tool entries (server with no tools)
            tools = [
                t for t in (r["tools"] or [])
                if t.get("name") is not None
            ]
            servers.append({
                "server_name":   r["server_name"],
                "version":       r["version"] or "—",
                "department":    r["department"] or "—",
                "owner":         r["owner"] or "Unknown",
                "environment":   r["environment"] or "—",
                "transport":     r["transport"] or "stdio",
                "auth_required": r["auth_required"],
                "auth_type":     r["auth_type"] or "none",
                "public_exposed":r["public_exposed"],
                "tls_enabled":   r["tls_enabled"],
                "audit_enabled": r["audit_enabled"],
                "risk_level":    r["risk_level"] or "UNSCANNED",
                "risk_score":    r["risk_score"] if r["risk_score"] is not None else "—",
                "tools":         tools,
            })
        return servers


@router.get("/execution-logs")
def get_execution_logs(limit: int = Query(default=100, ge=1, le=500)):
    """
    Returns the last N execution log entries (tool calls) from the governance graph,
    ordered by most recent timestamp first.
    """
    logs = neo4j_service.get_execution_logs(limit=limit)
    return logs
