ROLE_PERMISSIONS = {

    "ANALYST": [
        "read_employee_record",
    ],

    "MANAGER": [
        "read_employee_record",
        "update_employee_record",
    ],

    "ADMIN": [
        "read_employee_record",
        "update_employee_record",
        "delete_employee_record",
    ],
}


def check_permission(role: str, tool_name: str):

    allowed_tools = ROLE_PERMISSIONS.get(role, [])

    if tool_name not in allowed_tools:
        raise PermissionError(
            f"{role} cannot execute {tool_name}"
        )

    return True