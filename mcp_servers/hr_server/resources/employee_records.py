from fastmcp import FastMCP


def register_resources(mcp: FastMCP):

    @mcp.resource("hr://employees/latest")
    def latest_employee_record() -> str:
        """
        Latest employee information.
        """

        return """
Employee Record

Employee ID : EMP1023
Name        : Alice Johnson
Department  : Data Science
Designation : Senior Data Analyst
Status      : Active
Leave Balance : 12 Days
"""