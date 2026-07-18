from config import SERVER_CONFIG


VALID_API_KEYS = {
    "hr-admin-key": {
        "user": "HR Admin",
        "role": "ADMIN",
    },
    "hr-manager-key": {
        "user": "HR Manager",
        "role": "MANAGER",
    },
    "hr-executive-key": {
        "user": "HR Executive",
        "role": "ANALYST",
    },
}


def authenticate(api_key: str):

    if not SERVER_CONFIG["authentication"]["enabled"]:
        return {
            "authenticated": True,
            "user": "Anonymous",
            "role": "ADMIN",
        }

    user = VALID_API_KEYS.get(api_key)

    if user is None:
        raise PermissionError("Invalid API Key")

    return {
        "authenticated": True,
        "user": user["user"],
        "role": user["role"],
    }