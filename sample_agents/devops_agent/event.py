from dataclasses import dataclass
from datetime import datetime
import uuid


@dataclass
class MCPExecutionEvent:

    execution_id: str

    brain_agent: str

    agent: str

    mcp_server: str

    tool: str

    user: str

    role: str

    status: str

    timestamp: str

    @staticmethod
    def create(
        brain_agent: str,
        agent: str,
        server: str,
        tool: str,
        user: str,
        role: str,
        status: str,
    ):

        return MCPExecutionEvent(
            execution_id=str(uuid.uuid4()),
            brain_agent=brain_agent,
            agent=agent,
            mcp_server=server,
            tool=tool,
            user=user,
            role=role,
            status=status,
            timestamp=datetime.utcnow().isoformat(),
        )

    def to_dict(self):
        return {
            "event": "mcp_execution",
            "execution_id": self.execution_id,
            "brain_agent": self.brain_agent,
            "agent": self.agent,
            "mcp_server": self.mcp_server,
            "tool": self.tool,
            "user": self.user,
            "role": self.role,
            "status": self.status,
            "timestamp": self.timestamp,
        }