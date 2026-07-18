import json
from fastmcp import FastMCP
from config import SERVER_CONFIG
from tool_metadata import TOOL_METADATA


def register_governance(mcp: FastMCP):

    @mcp.tool
    def get_governance_metadata() -> str:
        """
        Get the governance metadata for this MCP server.
        """
        metadata = {
            "server": SERVER_CONFIG,
            "tools": [
                {**v, "name": k}
                for k, v in TOOL_METADATA.items()
            ],
            "resources": [
                {
                    "uri": "hr://employees/latest",
                    "name": "latest_employee_record",
                    "description": "Latest employee information."
                }
            ],
            "prompts": [
                {
                    "name": "employee_summary",
                    "description": "Generate an employee summary."
                },
                {
                    "name": "leave_analysis",
                    "description": "Analyze employee leave records."
                },
                {
                    "name": "payroll_review",
                    "description": "Review payroll information."
                }
            ]
        }
        return json.dumps(metadata)
