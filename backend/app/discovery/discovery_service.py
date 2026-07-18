from app.discovery.config_discovery import ConfigDiscovery
from app.discovery.agent_discovery import agent_discovery


class DiscoveryService:

    def __init__(self):
        self.config = ConfigDiscovery()

    def discover_servers(self, config_path: str):
        return self.config.discover(config_path)

    def discover_from_config(self, config_path: str):
        return self.discover_servers(config_path)

    def discover_agents(self, agents_root: str):
        return agent_discovery.discover(agents_root)


discovery_service = DiscoveryService()