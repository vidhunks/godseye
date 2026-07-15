from fastapi import APIRouter

from app.services.neo4j_service import neo4j_service

router = APIRouter(prefix="/mcp", tags=["MCP"])


@router.post("/register")
def register_mcp(uri: str):

    neo4j_service.create_mcp_server(uri)

    return {
        "message": "MCP Server Registered",
        "uri": uri
    }