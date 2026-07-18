import json
import os
from fastapi import APIRouter

from app.discovery.discovery_service import discovery_service
from app.scanner.scanner import scanner
from app.risk.risk_engine import risk_engine
from app.services.neo4j_service import neo4j_service
from app.governance.database import neo4j

router = APIRouter(
    prefix="/discovery",
    tags=["Discovery"],
)


@router.post("/config")
def discover(config_path: str):

    servers = discovery_service.discover_from_config(config_path)

    # Attempt to resolve agent name from agent config
    agent_name = "Discovered Agent"
    try:
        abs_conf_path = config_path
        if not os.path.exists(abs_conf_path):
            abs_conf_path = os.path.abspath(os.path.join("..", config_path))
        with open(abs_conf_path, "r", encoding="utf-8") as f:
            agent_config = json.load(f)
            agent_name = agent_config.get("agent_name", "Discovered Agent")
    except Exception:
        pass

    results = []

    for server in servers:

        scan = scanner.scan(server)

        # Save server metadata and tools statically (Do NOT pre-evaluate risk)
        neo4j_service.create_mcp_server(scan.server)

        for tool in scan.tools:
            neo4j_service.create_tool(
                server_uri=scan.uri,
                tool=tool,
            )

        # Link Agent to MCPServer
        neo4j_service.create_usage(
            agent=agent_name,
            server=scan.uri,
        )

        results.append(
            {
                "server": scan.uri,
                "status": "statically_discovered",
            }
        )

    return results


@router.get("/agents")
def discover_agents():

    return discovery_service.discover_agents(
        "../sample_agents"
    )


@router.post("/bootstrap")
def bootstrap():
    """
    Clears the graph database to prepare for a fresh network scan.
    """
    with neo4j.driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")

    return {
        "status": "success",
        "message": "Ecosystem static topology discovery initialized (graph database cleared, ready for scan).",
        "bootstrapped_components": [],
    }


@router.post("/scan-all")
def scan_all():
    """
    Performs a bulk network scan. Rebuilds the entire topology in Neo4j dynamically,
    evaluates risk postures for all servers, and writes risk assessment parameters.
    """
    # 1. Clear database to ensure graph is ONLY generated during scan
    with neo4j.driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")

    brain_config_path = "../sample_agents/brain_agent/agent_config.json"
    with open(brain_config_path, "r", encoding="utf-8") as f:
        brain_config = json.load(f)

    brain_name = brain_config["agent_name"]
    managed_folders = brain_config["managed_agents"]
    results = []

    # 2. Create the Admin User node and link to Brain Agent (enables blast radius traversal)
    neo4j_service.create_user("Admin", "ADMIN")
    neo4j_service.link_user_to_agent("Admin", brain_name)

    for folder in managed_folders:
        agent_config_path = f"../sample_agents/{folder}/agent_config.json"
        if not os.path.exists(agent_config_path):
            continue

        with open(agent_config_path, "r", encoding="utf-8") as f:
            agent_config = json.load(f)

        agent_name = agent_config["agent_name"]

        # Connect Brain Agent -> Sub-agent orchestration
        neo4j_service.create_orchestration(
            source=brain_name,
            target=agent_name,
        )

        for server_conf in agent_config.get("mcpServers", []):
            args_resolved = []
            for arg in server_conf.get("args", []):
                if "server.py" in arg:
                    mcp_servers_idx = arg.find("mcp_servers")
                    if mcp_servers_idx != -1:
                        subpath = arg[mcp_servers_idx:]
                        abs_path = os.path.abspath(os.path.join("..", subpath))
                    else:
                        abs_path = os.path.abspath(
                            os.path.join(
                                "../sample_agents",
                                folder,
                                arg,
                            )
                        )
                    args_resolved.append(abs_path)
                else:
                    args_resolved.append(arg)

            server_resolved = {
                "name": server_conf["name"],
                "transport": server_conf["transport"],
                "command": server_conf["command"],
                "args": args_resolved,
            }

            # Scan and run compliance checks
            scan = scanner.scan(server_resolved)
            risk = risk_engine.evaluate(scan)

            # Persist MCPServer details
            neo4j_service.create_mcp_server(scan.server)
            for tool in scan.tools:
                neo4j_service.create_tool(scan.uri, tool)
            neo4j_service.create_risk_assessment(scan.uri, risk)

            # Connect Agent -> GodsEye Proxy -> MCPServer
            neo4j_service.create_usage(
                agent=agent_name,
                server=scan.uri,
            )

            results.append(
                {
                    "server": scan.uri,
                    "risk_score": risk["score"],
                    "risk_level": risk["level"],
                }
            )

    return {
        "status": "success",
        "message": "Full compliance network scan completed successfully.",
        "results": results,
    }