SERVER_CONFIG = {
    "id": "MCP001",
    "name": "Finance MCP",
    "version": "1.0.0",
    "department": "Finance",
    "owner": "Finance Team",
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