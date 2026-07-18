SERVER_CONFIG = {
    "id": "MCP002",
    "name": "HR MCP",
    "version": "1.0.0",
    "department": "HR",
    "owner": "HR Team",
    "environment": "Production",

    "transport": "stdio",

    "authentication": {
        "enabled": True,
        "type": "API_KEY"
    },

    "network": {
        "publicly_reachable": False,
        "tls_enabled": True
    },

    "audit": {
        "enabled": True
    }
}