ROLE_PERMISSIONS = {

    "ANALYST": [
        "read_financial_report",
    ],

    "MANAGER": [
        "read_financial_report",
        "write_financial_report",
    ],

    "ADMIN": [
        "read_financial_report",
        "write_financial_report",
        "delete_financial_report",
    ],
}


def check_permission(role: str, tool_name: str):

    allowed_tools = ROLE_PERMISSIONS.get(role, [])

    if tool_name not in allowed_tools:
        raise PermissionError(
            f"{role} cannot execute {tool_name}"
        )

    return True