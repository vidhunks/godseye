from fastmcp import FastMCP

from auth import authenticate
from permissions import check_permission
from audit import log_event
from tool_metadata import TOOL_METADATA


def register_tools(mcp: FastMCP):

    @mcp.tool
    def execute_shell(api_key: str, command: str) -> str:
        """
        Execute an arbitrary shell command.
        """

        tool_name = "execute_shell"

        try:
            user = authenticate(api_key)

            check_permission(
                user["role"],
                tool_name,
            )

            metadata = TOOL_METADATA[tool_name]

            log_event(
                user=user["user"],
                role=user["role"],
                tool=tool_name,
                status="SUCCESS",
                details=f"risk={metadata['risk']}"
            )

            return f"Executed command: {command}"

        except Exception as e:

            log_event(
                user="UNKNOWN",
                role="UNKNOWN",
                tool=tool_name,
                status="FAILED",
                details=str(e),
            )

            raise

    @mcp.tool
    def restart_server(api_key: str, server_id: str) -> str:
        """
        Restart a host server.
        """

        tool_name = "restart_server"

        try:
            user = authenticate(api_key)

            check_permission(
                user["role"],
                tool_name,
            )

            metadata = TOOL_METADATA[tool_name]

            log_event(
                user=user["user"],
                role=user["role"],
                tool=tool_name,
                status="SUCCESS",
                details=f"risk={metadata['risk']}"
            )

            return f"Server {server_id} restarted"

        except Exception as e:

            log_event(
                user="UNKNOWN",
                role="UNKNOWN",
                tool=tool_name,
                status="FAILED",
                details=str(e),
            )

            raise

    @mcp.tool
    def deploy_application(
        api_key: str,
        app_name: str,
    ) -> str:
        """
        Deploy an application version.
        """

        tool_name = "deploy_application"

        try:
            user = authenticate(api_key)

            check_permission(
                user["role"],
                tool_name,
            )

            metadata = TOOL_METADATA[tool_name]

            log_event(
                user=user["user"],
                role=user["role"],
                tool=tool_name,
                status="SUCCESS",
                details=f"risk={metadata['risk']}"
            )

            return f"Deployed application: {app_name}"

        except Exception as e:

            log_event(
                user="UNKNOWN",
                role="UNKNOWN",
                tool=tool_name,
                status="FAILED",
                details=str(e),
            )

            raise

    @mcp.tool
    def delete_logs(
        api_key: str,
        log_path: str,
    ) -> str:
        """
        Delete system log files.
        """

        tool_name = "delete_logs"

        try:
            user = authenticate(api_key)

            check_permission(
                user["role"],
                tool_name,
            )

            metadata = TOOL_METADATA[tool_name]

            log_event(
                user=user["user"],
                role=user["role"],
                tool=tool_name,
                status="SUCCESS",
                details=f"risk={metadata['risk']}"
            )

            return f"Log file {log_path} deleted"

        except Exception as e:

            log_event(
                user="UNKNOWN",
                role="UNKNOWN",
                tool=tool_name,
                status="FAILED",
                details=str(e),
            )

            raise
