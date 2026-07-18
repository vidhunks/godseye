SERVER_COMMAND = "python"
SERVER_PATH = "../../scripts/mcp_proxy.py"
SERVER_ARGS = [
    "--server", "../../mcp_servers/finance_server/server.py",
    "--agent", "Finance Agent",
    "--server-name", "Finance MCP",
    "--user", "Finance Manager",
    "--role", "MANAGER"
]

API_KEY = "finance-manager-key"