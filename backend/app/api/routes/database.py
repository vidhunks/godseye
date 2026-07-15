from fastapi import APIRouter

from app.governance.database import neo4j

router = APIRouter(prefix="/database", tags=["Database"])


@router.get("/ping")
def ping_database():
    with neo4j.driver.session() as session:
        result = session.run("RETURN 'Neo4j Connected' AS message")
        record = result.single()

    return {"message": record["message"]}