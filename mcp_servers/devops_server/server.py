from fastmcp import FastMCP

from tools.devops import register_tools
from resources.system_status import register_resources
from prompts.devops_prompts import register_prompts
from governance import register_governance

mcp = FastMCP("DevOps MCP Server")

register_tools(mcp)
register_resources(mcp)
register_prompts(mcp)
register_governance(mcp)

if __name__ == "__main__":
    mcp.run()