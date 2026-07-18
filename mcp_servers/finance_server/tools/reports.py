from fastmcp import FastMCP

from auth import authenticate
from permissions import check_permission
from audit import log_event
from tool_metadata import TOOL_METADATA


def register_tools(mcp: FastMCP):

    @mcp.tool
    def read_financial_report(api_key: str) -> str:
        """
        Read the latest financial report.
        """

        tool_name = "read_financial_report"

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

            return "Financial Report Loaded"

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
    def write_financial_report(
        api_key: str,
        report: str,
    ) -> str:
        """
        Write a financial report.
        """

        tool_name = "write_financial_report"

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

            return f"Report saved: {report}"

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
    def delete_financial_report(
        api_key: str,
        report_id: int,
    ) -> str:
        """
        Delete a financial report.
        """

        tool_name = "delete_financial_report"

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

            return f"Report {report_id} deleted"

        except Exception as e:

            log_event(
                user="UNKNOWN",
                role="UNKNOWN",
                tool=tool_name,
                status="FAILED",
                details=str(e),
            )

            raise