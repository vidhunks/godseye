from app.services.neo4j_service import neo4j_service


class EventBus:

    def __init__(self):
        self.events = []

    def publish(self, event: dict):

        self.events.append(event)

        print(f"[EVENT] {event}")

        if event["event"] == "agent_selected":

            neo4j_service.create_agent_relationship(
                source_agent=event["source"],
                target_agent=event["target"],
            )

    def get_events(self):

        return self.events


event_bus = EventBus()