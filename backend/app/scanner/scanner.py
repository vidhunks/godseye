from app.scanner.models import MCPScanResult


class MCPScanner:

    def scan(self, uri: str) -> MCPScanResult:

        # Temporary mock scanner
        return MCPScanResult(
            uri=uri,
            authentication_required=False,
            publicly_reachable=True,
            tools=[
                "read_file",
                "write_file",
                "delete_file"
            ]
        )


scanner = MCPScanner()