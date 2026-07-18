import json
from pathlib import Path


class AgentDiscovery:

    def discover(self, agents_root: str):

        discovered_agents = []

        agents_path = Path(agents_root)

        for folder in agents_path.iterdir():

            if not folder.is_dir():
                continue

            config_file = folder / "agent_config.json"

            if not config_file.exists():
                continue

            with open(config_file, "r") as f:
                config = json.load(f)

            discovered_agents.append(config)

        return discovered_agents


agent_discovery = AgentDiscovery()