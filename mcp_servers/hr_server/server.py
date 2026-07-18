from fastmcp import FastMCP

from tools.employee_records import register_tools
from resources.employee_records import register_resources
from prompts.hr_prompts import register_prompts
from governance import register_governance

mcp = FastMCP("HR MCP Server")

register_tools(mcp)
register_resources(mcp)
register_prompts(mcp)
register_governance(mcp)

if __name__ == "__main__":
    mcp.run()