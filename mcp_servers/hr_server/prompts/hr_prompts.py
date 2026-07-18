from fastmcp import FastMCP


def register_prompts(mcp: FastMCP):

    @mcp.prompt
    def employee_summary() -> str:
        """
        Generate an employee summary.
        """

        return (
            "Generate a concise summary of the employee's profile, "
            "department, designation, employment status, and leave balance."
        )

    @mcp.prompt
    def leave_analysis() -> str:
        """
        Analyze employee leave records.
        """

        return (
            "Analyze employee leave history and identify patterns, "
            "remaining leave balance, and leave utilization."
        )

    @mcp.prompt
    def payroll_review() -> str:
        """
        Review payroll information.
        """

        return (
            "Review employee payroll information and summarize salary, "
            "allowances, deductions, and recent payroll updates."
        )