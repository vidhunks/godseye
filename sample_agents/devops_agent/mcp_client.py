from mcp import ClientSession
from mcp.client.stdio import (
    stdio_client,
    StdioServerParameters,
)

from config import (
    SERVER_COMMAND,
    SERVER_PATH,
    SERVER_ARGS,
    API_KEY,
)


class DevOpsMCPClient:

    def __init__(self):

        import os
        import sys
        
        abs_proxy_path = os.path.abspath(
            os.path.join(
                os.path.dirname(__file__),
                SERVER_PATH
            )
        )
        
        resolved_args = []
        for arg in SERVER_ARGS:
            if "server.py" in arg:
                resolved_args.append(
                    os.path.abspath(
                        os.path.join(
                            os.path.dirname(__file__),
                            arg
                        )
                    )
                )
            else:
                resolved_args.append(arg)
                
        command = SERVER_COMMAND
        if command == "python":
            command = sys.executable
            
        self.server_params = StdioServerParameters(
            command=command,
            args=[abs_proxy_path] + resolved_args,
        )

        self.api_key = API_KEY

        self.stdio = None
        self.session = None

    async def connect(self):

        self.stdio = stdio_client(self.server_params)

        read_stream, write_stream = await self.stdio.__aenter__()

        self.session = ClientSession(
            read_stream,
            write_stream,
        )

        await self.session.__aenter__()

        await self.session.initialize()

        print("Connected to DevOps MCP Server")

    async def list_tools(self):

        result = await self.session.list_tools()

        print("\n========== TOOLS ==========")

        for tool in result.tools:
            print(f"- {tool.name}")

        print("===========================\n")

    async def list_resources(self):

        result = await self.session.list_resources()

        print("\n======= RESOURCES =======")

        for resource in result.resources:
            print(f"- {resource.uri}")

        print("=========================\n")

    async def list_prompts(self):

        result = await self.session.list_prompts()

        print("\n======== PROMPTS ========")

        for prompt in result.prompts:
            print(f"- {prompt.name}")

        print("=========================\n")

    async def call_execute_shell(self):

        result = await self.session.call_tool(
            "execute_shell",
            {
                "api_key": self.api_key,
                "command": "echo 'Testing DevOps Agent'",
            },
        )

        print("\n======= TOOL RESULT =======")
        print(result.content)
        print("===========================\n")

    async def close(self):

        if self.session:
            await self.session.__aexit__(None, None, None)

        if self.stdio:
            await self.stdio.__aexit__(None, None, None)