from config import SERVER_CONFIG


VALID_API_KEYS = {
    "finance-admin-key": {
        "user": "Finance Admin",
        "role": "ADMIN",
    },
    "finance-manager-key": {
        "user": "Finance Manager",
        "role": "MANAGER",
    },
    "finance-analyst-key": {
        "user": "Finance Analyst",
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