from config import SERVER_CONFIG


VALID_API_KEYS = {
    "devops-admin-key": {
        "user": "DevOps Admin",
        "role": "ADMIN",
    },
    "devops-manager-key": {
        "user": "DevOps Manager",
        "role": "MANAGER",
    },
    "devops-engineer-key": {
        "user": "DevOps Engineer",
        "role": "ENGINEER",
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