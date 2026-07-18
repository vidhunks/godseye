from fastmcp import FastMCP


def register_prompts(mcp: FastMCP):

    @mcp.prompt
    def deployment_check() -> str:
        """
        Check deployment status.
        """
        return "Review active deployments, check logs for errors, and report status."

    @mcp.prompt
    def server_restart_checklist() -> str:
        """
        Server restart checklist.
        """
        return "List prerequisite checks and verification steps before restarting a server."
