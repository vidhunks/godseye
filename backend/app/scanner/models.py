from pydantic import BaseModel


class ServerInfo(BaseModel):
    id: str
    name: str
    version: str
    department: str
    owner: str
    environment: str
    transport: str
    authentication_enabled: bool
    authentication_type: str
    publicly_reachable: bool
    tls_enabled: bool
    audit_enabled: bool


class ToolInfo(BaseModel):
    name: str
    id: str
    category: str
    permission: str
    risk: str
    resource: str
    description: str


class ResourceInfo(BaseModel):
    uri: str
    name: str
    description: str


class PromptInfo(BaseModel):
    name: str
    description: str


class ScannerResult(BaseModel):
    uri: str
    server: ServerInfo
    tools: list[ToolInfo]
    resources: list[ResourceInfo] = []
    prompts: list[PromptInfo] = []


# Backwards compatibility class (subclasses ScannerResult or exposes simplified fields)
class MCPScanResult(BaseModel):
    uri: str
    authentication_required: bool
    publicly_reachable: bool
    tools: list[str]