from fastapi import APIRouter

from app.scanner.scanner import scanner
from app.services.neo4j_service import neo4j_service
from app.risk.risk_engine import risk_engine

router = APIRouter(
    prefix="/scanner",
    tags=["Scanner"],
)


@router.post("/scan")
def scan(uri: str):

    result = scanner.scan(uri)

    risk = risk_engine.evaluate(result)

    neo4j_service.create_mcp_server(
        uri=result.uri,
        auth_required=result.authentication_required,
        public_exposed=result.publicly_reachable,
    )

    for tool in result.tools:
        neo4j_service.create_tool(
            server_uri=result.uri,
            tool_name=tool,
        )

    return {
        "scan": result,
        "risk": risk
    }