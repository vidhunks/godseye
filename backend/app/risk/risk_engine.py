from app.scanner.models import MCPScanResult

class RiskEngine:

    def evaluate(self, scan):

        score = 0
        reasons = []

        if scan.publicly_reachable:
            score += 40
            reasons.append("Publicly reachable MCP Server")

        if not scan.authentication_required:
            score += 30
            reasons.append("Authentication not required")

        dangerous = any(
            tool in ["write_file", "delete_file"]
            for tool in scan.tools
        )

        if dangerous:
            score += 20
            reasons.append("Dangerous tools exposed")

        external = any(
            tool in ["http_request", "api_call", "webhook"]
            for tool in scan.tools
        )

        if external:
            score += 10
            reasons.append("External API access")

        if score >= 70:
            level = "HIGH"
        elif score >= 40:
            level = "MEDIUM"
        else:
            level = "LOW"

        return {
            "score": score,
            "level": level,
            "reasons": reasons,
            "dangerous_tools": dangerous,
        }


risk_engine = RiskEngine()