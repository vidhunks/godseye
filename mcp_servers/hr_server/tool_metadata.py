TOOL_METADATA = {

    "read_employee_record": {
        "id": "HR001",
        "category": "READ",
        "permission": "ANALYST",
        "risk": "LOW",
        "resource": "employee_records",
        "description": "Read an employee record.",
    },

    "update_employee_record": {
        "id": "HR002",
        "category": "WRITE",
        "permission": "MANAGER",
        "risk": "MEDIUM",
        "resource": "employee_records",
        "description": "Create or update an employee record.",
    },

    "delete_employee_record": {
        "id": "HR003",
        "category": "DELETE",
        "permission": "ADMIN",
        "risk": "HIGH",
        "resource": "employee_records",
        "description": "Delete an employee record.",
    },

}