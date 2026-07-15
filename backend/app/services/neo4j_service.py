from app.governance.database import neo4j


class Neo4jService:

    def create_mcp_server(
        self,
        uri: str,
        auth_required: bool,
        public_exposed: bool,
    ):

        query = """
        MERGE (m:MCPServer {uri:$uri})

        SET
            m.auth_required=$auth_required,
            m.public_exposed=$public_exposed

        RETURN m
        """

        with neo4j.driver.session() as session:
            session.run(
                query,
                uri=uri,
                auth_required=auth_required,
                public_exposed=public_exposed,
            )
    def create_tool(self, server_uri: str, tool_name: str):

        query = """
        MATCH (m:MCPServer {uri: $server_uri})

        MERGE (t:Tool {name: $tool_name})

        MERGE (m)-[:EXPOSES]->(t)
        """

        with neo4j.driver.session() as session:
            session.run(
                query,
                server_uri=server_uri,
                tool_name=tool_name,
            )

neo4j_service = Neo4jService()