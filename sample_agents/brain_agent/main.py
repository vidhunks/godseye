import asyncio

from router import AgentRouter
from orchestrator import Orchestrator

from backend_client import publish_event
from event import MCPExecutionEvent


async def main():

    request = input("User Request : ")

    # Check if the gateway already selected an agent during the pre-flight phase
    import os
    selected_agent = os.getenv("PRE_SELECTED_AGENT")
    if selected_agent and selected_agent != "Brain Agent":
        print(f"[Brain Agent] Using pre-selected agent from gateway: {selected_agent}")
    else:
        router = AgentRouter()
        selected_agent = router.select_agent(request)

    if selected_agent is None:
        print("No suitable agent.")
        return

    print(f"\nBrain Agent selected : {selected_agent}")

    orchestrator = Orchestrator()

    result = await orchestrator.execute(selected_agent)

    if result is None:
        print("\nFinance Agent failed. Event not sent.\n")
        return

    event = MCPExecutionEvent.create(
        brain_agent="Brain Agent",
        agent=result["agent"],
        server=result["mcp_server"],
        tool=result["tool"],
        user=result["user"],
        role=result["role"],
        status=result["status"],
    )

    print("\n========== EXECUTION EVENT ==========")
    print(event)
    print("=====================================\n")

    publish_event(event)

    print("Workflow Completed Successfully")


if __name__ == "__main__":
    asyncio.run(main())