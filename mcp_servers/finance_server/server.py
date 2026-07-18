from fastmcp import FastMCP

from tools.reports import register_tools
from resources.financial_reports import register_resources
from prompts.finance_prompts import register_prompts
from governance import register_governance

mcp = FastMCP("Finance MCP Server")

register_tools(mcp)
register_resources(mcp)
register_prompts(mcp)
register_governance(mcp)

if __name__ == "__main__":
    mcp.run()