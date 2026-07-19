from app.governance.database import neo4j
from app.scanner.models import ServerInfo, ToolInfo


class Neo4jService:

    def create_mcp_server(self, server: ServerInfo):

        query = """
        MERGE (m:MCPServer {uri: $uri})
        SET
            m.name = $name,
            m.version = $version,
            m.department = $department,
            m.owner = $owner,
            m.environment = $environment,
            m.transport = $transport,
            m.auth_required = $auth_required,
            m.auth_type = $auth_type,
            m.public_exposed = $public_exposed,
            m.tls_enabled = $tls_enabled,
            m.audit_enabled = $audit_enabled
        RETURN m
        """

        with neo4j.driver.session() as session:
            session.run(
                query,
                uri=server.name,
                name=server.name,
                version=server.version,
                department=server.department,
                owner=server.owner,
                environment=server.environment,
                transport=server.transport,
                auth_required=server.authentication_enabled,
                auth_type=server.authentication_type,
                public_exposed=server.publicly_reachable,
                tls_enabled=server.tls_enabled,
                audit_enabled=server.audit_enabled,
            )

    def create_tool(self, server_uri: str, tool: ToolInfo):

        query = """
        MATCH (m:MCPServer {uri: $server_uri})
        MERGE (t:Tool {name: $tool_name})
        SET
            t.tool_id = $tool_id,
            t.category = $category,
            t.permission = $permission,
            t.risk = $risk,
            t.resource = $resource,
            t.description = $description
        MERGE (m)-[:EXPOSES]->(t)
        """

        with neo4j.driver.session() as session:
            session.run(
                query,
                server_uri=server_uri,
                tool_name=tool.name,
                tool_id=tool.id,
                category=tool.category,
                permission=tool.permission,
                risk=tool.risk,
                resource=tool.resource,
                description=tool.description,
            )

        # Automatically link Tool to its DataSource if the tool resource is defined
        if tool.resource:
            self.create_datasource(tool.resource)
            self.link_tool_to_datasource(tool.name, tool.resource)

    def create_risk_assessment(self, server_uri: str, risk: dict):

        query = """
        MATCH (m:MCPServer {uri: $server_uri})
        OPTIONAL MATCH (m)-[rel:HAS_RISK]->(old:RiskAssessment)
        DETACH DELETE old
        CREATE (r:RiskAssessment {
            score: $score,
            level: $level,
            findings: $findings,
            recommendations: $recommendations,
            timestamp: datetime()
        })
        CREATE (m)-[:HAS_RISK]->(r)
        """

        with neo4j.driver.session() as session:
            session.run(
                query,
                server_uri=server_uri,
                score=risk["score"],
                level=risk["level"],
                findings=risk["reasons"],
                recommendations=risk["recommendations"],
            )

    # ==========================
    # Model Node & Links
    # ==========================
    def create_model(self, model_name: str):
        query = """
        MERGE (m:Model {name: $name})
        """
        with neo4j.driver.session() as session:
            session.run(query, name=model_name)

    def link_agent_to_model(self, agent_name: str, model_name: str):
        query = """
        MERGE (a:Agent {name: $agent_name})
        MERGE (m:Model {name: $model_name})
        MERGE (a)-[:USES_MODEL]->(m)
        """
        with neo4j.driver.session() as session:
            session.run(query, agent_name=agent_name, model_name=model_name)

    # ==========================
    # DataSource Node & Links
    # ==========================
    def create_datasource(self, datasource_name: str):
        query = """
        MERGE (d:DataSource {name: $name})
        """
        with neo4j.driver.session() as session:
            session.run(query, name=datasource_name)

    def link_tool_to_datasource(self, tool_name: str, datasource_name: str):
        query = """
        MERGE (t:Tool {name: $tool_name})
        MERGE (d:DataSource {name: $datasource_name})
        MERGE (t)-[:ACCESSES]->(d)
        """
        with neo4j.driver.session() as session:
            session.run(query, tool_name=tool_name, datasource_name=datasource_name)

    # ==========================
    # Policy Node & Links
    # ==========================
    def create_policy(self, policy_id: str, name: str, description: str = ""):
        query = """
        MERGE (p:Policy {id: $id})
        SET p.name = $name, p.description = $description
        """
        with neo4j.driver.session() as session:
            session.run(query, id=policy_id, name=name, description=description)

    def link_agent_to_policy(self, agent_name: str, policy_id: str):
        query = """
        MERGE (a:Agent {name: $agent_name})
        MERGE (p:Policy {id: $policy_id})
        MERGE (a)-[:HAS_POLICY]->(p)
        """
        with neo4j.driver.session() as session:
            session.run(query, agent_name=agent_name, policy_id=policy_id)

    # ==========================
    # User Node & Links
    # ==========================
    def create_user(self, user_name: str, role: str):
        query = """
        MERGE (u:User {name: $name})
        SET u.role = $role
        """
        with neo4j.driver.session() as session:
            session.run(query, name=user_name, role=role)

    def link_user_to_agent(self, user_name: str, agent_name: str):
        query = """
        MERGE (u:User {name: $user_name})
        MERGE (a:Agent {name: $agent_name})
        MERGE (u)-[:CALLS_AGENT]->(a)
        """
        with neo4j.driver.session() as session:
            session.run(query, user_name=user_name, agent_name=agent_name)

    # ==========================
    # Orchestration & Usage Links
    # ==========================
    def create_agent_relationship(
        self,
        source_agent: str,
        target_agent: str,
    ):

        query = """
        MERGE (a:Agent {name:$source})
        MERGE (b:Agent {name:$target})
        MERGE (a)-[:ORCHESTRATES]->(b)
        """

        with neo4j.driver.session() as session:
            session.run(
                query,
                source=source_agent,
                target=target_agent,
            )

    def create_orchestration(
        self,
        source: str,
        target: str,
    ):

        query = """
        MERGE (a:Agent {name:$source})
        MERGE (b:Agent {name:$target})
        MERGE (a)-[:ORCHESTRATES]->(b)
        """

        with neo4j.driver.session() as session:
            session.run(
                query,
                source=source,
                target=target,
            )

    def create_usage(
        self,
        agent: str,
        server: str,
    ):
        proxy_name = f"GodsEye Proxy ({server})"
        query = """
        MERGE (a:Agent {name:$agent})
        MERGE (m:MCPServer {uri:$server})
        MERGE (p:Proxy {name:$proxy_name})
        MERGE (a)-[:USES]->(p)
        MERGE (p)-[:CONNECTS_TO]->(m)
        """

        with neo4j.driver.session() as session:
            session.run(
                query,
                agent=agent,
                server=server,
                proxy_name=proxy_name,
            )

    def create_tool_call(
        self,
        server: str,
        tool: str,
        status: str = "SUCCESS",
        agent: str = None,
    ):
        # 1. Update the active topology relationship for visualization
        query_topology = """
        MERGE (m:MCPServer {uri:$server})
        MERGE (t:Tool {name:$tool})
        MERGE (m)-[c:CALLS]->(t)
        SET c.status = $status, c.timestamp = datetime()
        """
        
        # 2. Create a persistent ExecutionLog node that is preserved on scan reset
        query_log = """
        CREATE (l:ExecutionLog {
            agent: $agent,
            mcp_server: $server,
            tool: $tool,
            status: $status,
            timestamp: datetime()
        })
        """

        with neo4j.driver.session() as session:
            session.run(
                query_topology,
                server=server,
                tool=tool,
                status=status,
            )
            session.run(
                query_log,
                agent=agent or "Unknown Agent",
                server=server,
                tool=tool,
                status=status,
            )

    def get_execution_logs(self, limit: int = 100):
        """
        Returns the last N execution log entries stored as persistent ExecutionLog nodes
        in Neo4j, ordered by most recent first.
        """
        query = """
        MATCH (l:ExecutionLog)
        RETURN
            l.agent AS agent,
            l.mcp_server AS mcp_server,
            l.tool AS tool,
            l.status AS status,
            toString(l.timestamp) AS timestamp
        ORDER BY l.timestamp DESC
        LIMIT $limit
        """
        logs = []
        try:
            with neo4j.driver.session() as session:
                result = session.run(query, limit=limit)
                for record in result:
                    logs.append({
                        "agent":      record["agent"],
                        "mcp_server": record["mcp_server"],
                        "tool":       record["tool"],
                        "status":     record["status"] or "SUCCESS",
                        "timestamp":  record["timestamp"],
                    })
        except Exception as e:
            print(f"[ExecutionLogs] Failed to fetch logs: {e}")
        return logs


neo4j_service = Neo4jService()