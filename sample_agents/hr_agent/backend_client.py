import requests

BACKEND_URL = "http://127.0.0.1:8000/events/"


def publish_event(event):
    response = requests.post(
        BACKEND_URL,
        json=event.to_dict(),
        timeout=10,
    )

    response.raise_for_status()

    print("\n========== BACKEND RESPONSE ==========")
    print(response.json())
    print("======================================\n")