from fastmcp import FastMCP

from auth import authenticate
from permissions import check_permission
from audit import log_event
from tool_metadata import TOOL_METADATA


def register_tools(mcp: FastMCP):

    @mcp.tool
    def read_employee_record(api_key: str) -> str:
        """
        Read an employee record.
        """

        tool_name = "read_employee_record"

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

            return "Employee Record Loaded"

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
    def update_employee_record(
        api_key: str,
        employee_data: str,
    ) -> str:
        """
        Create or update an employee record.
        """

        tool_name = "update_employee_record"

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

            return f"Employee record updated: {employee_data}"

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
    def delete_employee_record(
        api_key: str,
        employee_id: int,
    ) -> str:
        """
        Delete an employee record.
        """

        tool_name = "delete_employee_record"

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

            return f"Employee {employee_id} deleted"

        except Exception as e:

            log_event(
                user="UNKNOWN",
                role="UNKNOWN",
                tool=tool_name,
                status="FAILED",
                details=str(e),
            )

            raise