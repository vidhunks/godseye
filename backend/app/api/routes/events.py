from fastapi import APIRouter

from app.models.event import MCPExecutionEvent
from app.services.neo4j_service import neo4j_service

router = APIRouter(
    prefix="/events",
    tags=["Events"],
)


@router.post("/")
def receive_event(event: MCPExecutionEvent):

    print("\n========== MCP EXECUTION ==========")
    print(event.model_dump())
    print("===================================\n")

    # Ingest User Node and connect it to the Brain Agent
    if event.user:
        role = event.role or "USER"
        neo4j_service.create_user(event.user, role)
        neo4j_service.link_user_to_agent(
            user_name=event.user,
            agent_name=event.brain_agent,
        )

    # Brain Agent -> Sub-Agent
    neo4j_service.create_orchestration(
        source=event.brain_agent,
        target=event.agent,
    )

    # Sub-Agent -> MCP Server
    neo4j_service.create_usage(
        agent=event.agent,
        server=event.mcp_server,
    )

    # MCP Server -> Tool Call (dynamic log)
    neo4j_service.create_tool_call(
        server=event.mcp_server,
        tool=event.tool,
        status=event.status or "SUCCESS",
        agent=event.agent,
        user=event.user,
        role=event.role,
    )

    return {
        "status": "success",
        "execution_id": event.execution_id,
    }