import asyncio

from mcp_client import DevOpsMCPClient


async def execute():

    client = DevOpsMCPClient()

    try:
        await client.connect()

        await client.list_tools()
        await client.list_resources()
        await client.list_prompts()

        await client.call_execute_shell()

        return {
            "agent": "DevOps Agent",
            "mcp_server": "DevOps MCP",
            "tool": "execute_shell",
            "user": "DevOps Admin",
            "role": "ADMIN",
            "status": "SUCCESS",
        }

    finally:
        await client.close()


async def main():

    result = await execute()

    print(result)


if __name__ == "__main__":
    asyncio.run(main())