from pydantic import BaseModel


class MCPScanResult(BaseModel):
    uri: str
    authentication_required: bool
    publicly_reachable: bool
    tools: list[str]