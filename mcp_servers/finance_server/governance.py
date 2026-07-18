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
                    "uri": "finance://reports/latest",
                    "name": "latest_financial_report",
                    "description": "Latest quarterly financial report."
                }
            ],
            "prompts": [
                {
                    "name": "quarterly_summary",
                    "description": "Generate a quarterly financial summary."
                },
                {
                    "name": "budget_analysis",
                    "description": "Analyze department budgets."
                },
                {
                    "name": "invoice_review",
                    "description": "Review pending invoices."
                }
            ]
        }
        return json.dumps(metadata)
