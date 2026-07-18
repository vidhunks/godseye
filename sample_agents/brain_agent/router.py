class AgentRouter:

    def select_agent(self, user_request: str):

        request = user_request.lower()

        if any(word in request for word in ["finance", "budget", "invoice", "report"]):
            return "Finance Agent"

        if any(word in request for word in ["employee", "leave", "salary", "hr"]):
            return "HR Agent"

        if any(word in request for word in ["server", "docker", "deployment", "cpu", "shell", "restart", "deploy", "log"]):
            return "DevOps Agent"

        return None