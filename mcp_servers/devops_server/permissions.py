ROLE_PERMISSIONS = {

    "ENGINEER": [
        "restart_server",
        "deploy_application",
    ],

    "MANAGER": [
        "restart_server",
        "deploy_application",
    ],

    "ADMIN": [
        "execute_shell",
        "restart_server",
        "deploy_application",
        "delete_logs",
    ],
}


def check_permission(role: str, tool_name: str):

    allowed_tools = ROLE_PERMISSIONS.get(role, [])

    if tool_name not in allowed_tools:
        raise PermissionError(
            f"{role} cannot execute {tool_name}"
        )

    return True