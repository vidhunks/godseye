from app.scanner.models import ScannerResult


class RiskEngine:

    def evaluate(self, scan: ScannerResult):

        score = 10
        reasons = []
        recommendations = []

        # ==========================
        # 1. Authentication Rule
        # ==========================
        if not scan.server.authentication_enabled:
            score += 30
            reasons.append("Authentication is disabled on this server.")
            recommendations.append("Enable API-key authentication to prevent unauthorized tool access.")

        # ==========================
        # 2. Network / Encryption Rules
        # ==========================
        if not scan.server.tls_enabled:
            score += 30
            reasons.append("TLS encryption is disabled for transit data.")
            recommendations.append("Enforce TLS (HTTPS/WSS) on network connections.")

        if scan.server.publicly_reachable:
            score += 10
            reasons.append("Server is publicly accessible on the internet.")
            recommendations.append("Bind the server to a private subnet or internal network space.")

        # ==========================
        # 3. Tool Capabilities Rule
        # ==========================
        has_high_impact = False
        for tool in scan.tools:
            cat = tool.category.upper()
            if cat in ["DELETE", "EXECUTE"]:
                if not has_high_impact:
                    score += 20
                    has_high_impact = True
                reasons.append(f"High-impact administrative category tool exposed: {tool.name} ({tool.category})")
                recommendations.append(f"Restrict execution rights for tool: {tool.name} to ADMIN role.")

        # Clamp overall score to 100
        score = min(score, 100)

        # Thresholds:
        # Score >= 60 is HIGH, >= 35 is MEDIUM, else LOW
        if score >= 60:
            level = "HIGH"
        elif score >= 35:
            level = "MEDIUM"
        else:
            level = "LOW"

        # Unique recommendations (removing duplicates)
        recommendations = list(dict.fromkeys(recommendations))

        return {
            "score": score,
            "level": level,
            "reasons": reasons,
            "findings": reasons,  # aliased for compatibility
            "recommendations": recommendations,
        }


risk_engine = RiskEngine()