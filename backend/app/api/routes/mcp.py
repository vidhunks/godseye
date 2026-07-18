from fastapi import APIRouter

from app.services.neo4j_service import neo4j_service
from app.scanner.models import ServerInfo

router = APIRouter(prefix="/mcp", tags=["MCP"])


@router.post("/register")
def register_mcp(server: ServerInfo):

    neo4j_service.create_mcp_server(server)

    return {
        "message": "MCP Server Registered",
        "uri": server.name
    }