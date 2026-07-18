from fastapi import FastAPI

from app.api.router import router
from app.core.config import settings
from app.api.routes import discovery
from app.api.routes import events

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
)

app.include_router(router)
app.include_router(discovery.router)
app.include_router(events.router)