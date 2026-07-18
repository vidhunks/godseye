import asyncio
import os
import sys


class Orchestrator:

    async def execute(self, agent):

        if agent == "Finance Agent":

            finance_path = os.path.join(
                os.path.dirname(__file__),
                "..",
                "finance_agent",
                "main.py",
            )

            process = await asyncio.create_subprocess_exec(
                sys.executable,
                finance_path,
            )

            return_code = await process.wait()

            if return_code != 0:
                print("\nFinance Agent execution failed.\n")
                return None

            return {
                "agent": "Finance Agent",
                "mcp_server": "Finance MCP",
                "tool": "read_financial_report",
                "user": "Finance Manager",
                "role": "MANAGER",
                "status": "SUCCESS",
            }

        elif agent == "HR Agent":

            hr_path = os.path.join(
                os.path.dirname(__file__),
                "..",
                "hr_agent",
                "main.py",
            )

            process = await asyncio.create_subprocess_exec(
                sys.executable,
                hr_path,
            )

            return_code = await process.wait()

            if return_code != 0:
                print("\nHR Agent execution failed.\n")
                return None

            return {
                "agent": "HR Agent",
                "mcp_server": "HR MCP",
                "tool": "read_employee_record",
                "user": "HR Manager",
                "role": "MANAGER",
                "status": "SUCCESS",
            }

        elif agent == "DevOps Agent":

            devops_path = os.path.join(
                os.path.dirname(__file__),
                "..",
                "devops_agent",
                "main.py",
            )

            process = await asyncio.create_subprocess_exec(
                sys.executable,
                devops_path,
            )

            return_code = await process.wait()

            if return_code != 0:
                print("\nDevOps Agent execution failed.\n")
                return None

            return {
                "agent": "DevOps Agent",
                "mcp_server": "DevOps MCP",
                "tool": "execute_shell",
                "user": "DevOps Admin",
                "role": "ADMIN",
                "status": "SUCCESS",
            }

        return None