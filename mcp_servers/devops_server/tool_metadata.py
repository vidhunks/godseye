TOOL_METADATA = {

    "execute_shell": {
        "id": "DO001",
        "category": "EXECUTE",
        "permission": "ADMIN",
        "risk": "HIGH",
        "resource": "system_shell",
        "description": "Execute an arbitrary shell command.",
    },

    "restart_server": {
        "id": "DO002",
        "category": "RESTART",
        "permission": "ENGINEER",
        "risk": "MEDIUM",
        "resource": "server_hosts",
        "description": "Restart a host server.",
    },

    "deploy_application": {
        "id": "DO003",
        "category": "DEPLOY",
        "permission": "ENGINEER",
        "risk": "MEDIUM",
        "resource": "k8s_deployments",
        "description": "Deploy an application version.",
    },

    "delete_logs": {
        "id": "DO004",
        "category": "DELETE",
        "permission": "ADMIN",
        "risk": "HIGH",
        "resource": "server_logs",
        "description": "Delete system log files.",
    },

}