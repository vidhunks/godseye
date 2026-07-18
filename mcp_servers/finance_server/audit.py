from datetime import datetime
from pathlib import Path


LOG_FILE = Path(__file__).parent / "logs" / "audit.log"


def log_event(
    user: str,
    role: str,
    tool: str,
    status: str,
    details: str = "",
):

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    log_line = (
        f"[{timestamp}] "
        f"user={user} "
        f"role={role} "
        f"tool={tool} "
        f"status={status} "
        f"{details}\n"
    )

    with open(LOG_FILE, "a", encoding="utf-8") as file:
        file.write(log_line)