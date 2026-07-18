from fastmcp import FastMCP


def register_prompts(mcp: FastMCP):

    @mcp.prompt
    def quarterly_summary() -> str:
        """
        Generate a quarterly financial summary.
        """
        return (
            "Generate a concise executive summary of the latest "
            "quarterly financial report highlighting revenue, "
            "expenses, profit, and key business risks."
        )

    @mcp.prompt
    def budget_analysis() -> str:
        """
        Analyze department budgets.
        """
        return (
            "Analyze departmental budgets and identify overspending, "
            "under-utilization, and optimization opportunities."
        )

    @mcp.prompt
    def invoice_review() -> str:
        """
        Review pending invoices.
        """
        return (
            "Review outstanding invoices and summarize pending "
            "payments and high-value transactions."
        )