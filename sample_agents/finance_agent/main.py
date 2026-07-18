import asyncio

from mcp_client import FinanceMCPClient


async def execute():

    client = FinanceMCPClient()

    try:
        await client.connect()

        await client.list_tools()
        await client.list_resources()
        await client.list_prompts()

        await client.call_read_report()

        return {
            "agent": "Finance Agent",
            "mcp_server": "Finance MCP",
            "tool": "read_financial_report",
            "user": "Finance Manager",
            "role": "MANAGER",
            "status": "SUCCESS",
        }

    finally:
        await client.close()


async def main():

    result = await execute()

    print(result)


if __name__ == "__main__":
    asyncio.run(main())