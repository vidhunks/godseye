from fastmcp import FastMCP


def register_resources(mcp: FastMCP):

    @mcp.resource("devops://system/status")
    def system_status() -> str:
        """
        DevOps system status.
        """
        return """
System Health: OK
CPU Usage: 45%
Memory Usage: 62%
Active Deployments: 8
"""
