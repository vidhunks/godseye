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
                    "uri": "devops://system/status",
                    "name": "system_status",
                    "description": "DevOps system status."
                }
            ],
            "prompts": [
                {
                    "name": "deployment_check",
                    "description": "Check deployment status."
                },
                {
                    "name": "server_restart_checklist",
                    "description": "Server restart checklist."
                }
            ]
        }
        return json.dumps(metadata)
