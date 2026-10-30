from datetime import datetime, timezone
from typing import Dict, Any
from pydantic import BaseModel, Field


class HealthCheckResponse(BaseModel):
    status: str = Field(..., description="Overall service status ('healthy' or 'degraded')")
    service: str = Field(..., description="Name of the service")
    version: str = Field(..., description="Service version")
    environment: str = Field(..., description="Runtime environment")
    database_connected: bool = Field(..., description="True if database connectivity is verified")
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="UTC timestamp of the health check",
    )
    details: Dict[str, Any] = Field(
        default_factory=dict,
        description="Supplemental runtime information",
    )

