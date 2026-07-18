import asyncio

from mcp_client import HRMCPClient


async def execute():

    client = HRMCPClient()

    try:
        await client.connect()

        await client.list_tools()
        await client.list_resources()
        await client.list_prompts()

        await client.call_read_employee()

        return {
            "agent": "HR Agent",
            "mcp_server": "HR MCP",
            "tool": "read_employee_record",
            "user": "HR Manager",
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