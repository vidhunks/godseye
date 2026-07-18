from fastapi import APIRouter

from app.api.routes.health import router as health_router
from app.api.routes.database import router as database_router
from app.api.routes.mcp import router as mcp_router
from app.api.routes.scanner import router as scanner_router
from app.api.routes.governance import router as governance_router

router = APIRouter()

router.include_router(health_router)
router.include_router(database_router)
router.include_router(mcp_router)
router.include_router(scanner_router)
router.include_router(governance_router)