import asyncio
import json
import sys

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

from app.scanner.models import (
    ScannerResult,
    ServerInfo,
    ToolInfo,
    ResourceInfo,
    PromptInfo,
)


class MCPScanner:

    def resolve_server(self, name: str) -> dict:
        servers_map = {
            "Finance MCP": {
                "name": "Finance MCP",
                "transport": "stdio",
                "command": "python",
                "args": ["../mcp_servers/finance_server/server.py"]
            },
            "HR MCP": {
                "name": "HR MCP",
                "transport": "stdio",
                "command": "python",
                "args": ["../mcp_servers/hr_server/server.py"]
            },
            "DevOps MCP": {
                "name": "DevOps MCP",
                "transport": "stdio",
                "command": "python",
                "args": ["../mcp_servers/devops_server/server.py"]
            }
        }
        if name in servers_map:
            return servers_map[name]
        raise ValueError(f"Could not resolve server name to configuration: {name}")

    async def _scan_stdio(self, server: dict) -> ScannerResult:

        # Ensure we run using the active virtual environment python executable
        command = server["command"]
        if command == "python":
            command = sys.executable

        server_params = StdioServerParameters(
            command=command,
            args=server["args"],
        )

        async with stdio_client(server_params) as (read, write):

            async with ClientSession(read, write) as session:

                await session.initialize()

                # Fetch governance metadata
                meta_response = await session.call_tool("get_governance_metadata")
                meta_str = meta_response.content[0].text
                meta = json.loads(meta_str)

                server_meta = meta["server"]
                tools_meta = meta["tools"]
                resources_meta = meta.get("resources", [])
                prompts_meta = meta.get("prompts", [])

                server_info = ServerInfo(
                    id=server_meta["id"],
                    name=server_meta["name"],
                    version=server_meta["version"],
                    department=server_meta["department"],
                    owner=server_meta["owner"],
                    environment=server_meta["environment"],
                    transport=server_meta["transport"],
                    authentication_enabled=server_meta["authentication"]["enabled"],
                    authentication_type=server_meta["authentication"]["type"],
                    publicly_reachable=server_meta["network"]["publicly_reachable"],
                    tls_enabled=server_meta["network"]["tls_enabled"],
                    audit_enabled=server_meta["audit"]["enabled"],
                )

                tools_list = [
                    ToolInfo(
                        name=t["name"],
                        id=t["id"],
                        category=t["category"],
                        permission=t["permission"],
                        risk=t["risk"],
                        resource=t["resource"],
                        description=t["description"]
                    ) for t in tools_meta
                ]

                resources_list = [
                    ResourceInfo(
                        uri=r["uri"],
                        name=r["name"],
                        description=r["description"]
                    ) for r in resources_meta
                ]

                prompts_list = [
                    PromptInfo(
                        name=p["name"],
                        description=p["description"]
                    ) for p in prompts_meta
                ]

                return ScannerResult(
                    uri=server["name"],
                    server=server_info,
                    tools=tools_list,
                    resources=resources_list,
                    prompts=prompts_list,
                )

    def scan(self, server: dict | str) -> ScannerResult:

        if isinstance(server, str):
            server = self.resolve_server(server)

        transport = server["transport"]

        if transport == "stdio":
            return asyncio.run(
                self._scan_stdio(server)
            )

        raise ValueError(
            f"Unsupported transport: {transport}"
        )


scanner = MCPScanner()