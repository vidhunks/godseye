from datetime import datetime
from pydantic import BaseModel


class MCPExecutionEvent(BaseModel):
    event: str = "mcp_execution"

    execution_id: str

    brain_agent: str

    agent: str

    mcp_server: str

    tool: str

    user: str

    role: str

    status: str

    timestamp: datetime