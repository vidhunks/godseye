from fastmcp import FastMCP

def register_resources(mcp: FastMCP):

    @mcp.resource("finance://reports/latest")
    def latest_financial_report() -> str:
        """
        Latest quarterly financial report.
        """
        return """
Quarterly Financial Report

Revenue : $2,450,000
Expenses: $1,870,000
Profit  : $580,000

Status : Approved
"""