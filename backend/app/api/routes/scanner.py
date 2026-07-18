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

    # Save rich server metadata to Neo4j
    neo4j_service.create_mcp_server(result.server)

    # Save each tool's detail
    for tool in result.tools:
        neo4j_service.create_tool(
            server_uri=result.uri,
            tool=tool,
        )

    # Save risk assessment
    neo4j_service.create_risk_assessment(
        server_uri=result.uri,
        risk=risk,
    )

    return {
        "scan": result,
        "risk": risk
    }