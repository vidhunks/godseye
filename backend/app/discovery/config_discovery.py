import json


class ConfigDiscovery:

    def discover(self, config_path: str):

        with open(config_path, "r") as file:
            config = json.load(file)

        return config.get("mcpServers", [])