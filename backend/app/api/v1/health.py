from fastapi import APIRouter, status
from backend.app.core.config import settings
from backend.app.core.database import check_db_connection
from backend.app.schemas.health import HealthCheckResponse

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthCheckResponse,
    status_code=status.HTTP_200_OK,
    summary="Health check endpoint",
    description="Returns the health status of the API service and its database connection.",
)
def get_health() -> HealthCheckResponse:
    db_ok = check_db_connection()
    overall_status = "healthy" if db_ok else "degraded"

    return HealthCheckResponse(
        status=overall_status,
        service=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        database_connected=db_ok,
        details={
            "debug": settings.DEBUG,
            "database_type": "sqlite",
        },
    )

