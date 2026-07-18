from app.scanner.models import ScannerResult


class RiskEngine:

    def evaluate(self, scan: ScannerResult):

        score = 0
        reasons = []
        recommendations = []

        # ==========================
        # 1. Authentication Rule
        # ==========================
        if not scan.server.authentication_enabled:
            score += 20
            reasons.append("Authentication is disabled on this server.")
            recommendations.append("Enable API-key authentication to prevent unauthorized tool access.")
        elif scan.server.authentication_type.upper() not in ["API_KEY", "OAUTH2"]:
            score += 5
            reasons.append(f"Weak authentication type configured: {scan.server.authentication_type}")
            recommendations.append("Upgrade to standard API_KEY or OAUTH2 authentication.")

        # ==========================
        # 2. Network Rule
        # ==========================
        if scan.server.publicly_reachable:
            score += 25
            reasons.append("Server is publicly accessible on the internet.")
            recommendations.append("Bind the server to a private subnet or internal network space.")
        if not scan.server.tls_enabled:
            score += 10
            reasons.append("TLS encryption is disabled for transit data.")
            recommendations.append("Enforce TLS (HTTPS/WSS) on network connections.")

        # ==========================
        # 3. Tool Rule (Capped at 20 max to avoid pushing secure servers into HIGH risk)
        # ==========================
        tool_score = 0
        has_high_impact = False
        has_state_modifying = False
        has_high_risk = False
        has_medium_risk = False

        for tool in scan.tools:
            cat = tool.category.upper()
            risk = tool.risk.upper()

            if cat in ["DELETE", "EXECUTE"]:
                if not has_high_impact:
                    tool_score += 15
                    has_high_impact = True
                reasons.append(f"High-impact administrative category tool exposed: {tool.name} ({tool.category})")
                recommendations.append(f"Restrict execution rights for tool: {tool.name} to ADMIN role.")

            elif cat in ["WRITE", "DEPLOY", "RESTART"]:
                if not has_state_modifying:
                    tool_score += 10
                    has_state_modifying = True
                reasons.append(f"State-modifying category tool exposed: {tool.name} ({tool.category})")
                recommendations.append(f"Limit write access to tool: {tool.name} to authorized roles (MANAGER/ENGINEER).")

            if risk == "HIGH":
                if not has_high_risk:
                    tool_score += 15
                    has_high_risk = True
                reasons.append(f"High-risk classified tool exposed: {tool.name}")
                recommendations.append(f"Examine blast-radius configuration for high-risk tool: {tool.name}.")
            elif risk == "MEDIUM":
                if not has_medium_risk:
                    tool_score += 5
                    has_medium_risk = True
                reasons.append(f"Medium-risk classified tool exposed: {tool.name}")
                recommendations.append(f"Ensure access policies require authorized agent tokens for tool: {tool.name}.")

        # Cap the capability tool score component to 20
        tool_score = min(tool_score, 20)
        score += tool_score

        # ==========================
        # 4. Operational Rule
        # ==========================
        if not scan.server.audit_enabled:
            score += 10
            reasons.append("Audit log publishing is disabled.")
            recommendations.append("Enable local log printing and events stream publishing on the server.")
        if not scan.server.owner or scan.server.owner.strip() == "":
            score += 2
            reasons.append("Server owner information is missing.")
            recommendations.append("Define owner attribute in SERVER_CONFIG configuration.")
        if not scan.server.version or scan.server.version.strip() == "":
            score += 2
            reasons.append("Server version information is missing.")
            recommendations.append("Define version attribute in SERVER_CONFIG configuration.")

        # Clamp overall score to 100
        score = min(score, 100)

        # Adjusted thresholds:
        # Finance and HR (perfect infra, exposes dangerous tools) -> Score: 20 -> LOW
        # DevOps (no auth, public, no TLS, no audit, exposes dangerous tools) -> Score: 85 -> HIGH
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