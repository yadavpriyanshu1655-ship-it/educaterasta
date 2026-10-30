from unittest.mock import patch
from fastapi.testclient import TestClient


def test_root_endpoint(client: TestClient):
    """Test that the root endpoint returns running status and service info."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Educaterasta"
    assert data["status"] == "running"
    assert "version" in data
    assert "docs" in data


def test_api_v1_health_endpoint(client: TestClient):
    """Test that /api/v1/health returns 200 OK and healthy status."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "Educaterasta"
    assert data["database_connected"] is True
    assert "timestamp" in data
    assert data["details"]["database_type"] == "sqlite"


def test_root_health_alias(client: TestClient):
    """Test that /health root alias returns identical healthy status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "Educaterasta"
    assert data["database_connected"] is True


def test_health_endpoint_degraded_when_db_down(client: TestClient):
    """Test that the health endpoint reports 'degraded' if DB connection check fails."""
    with patch("backend.app.api.v1.health.check_db_connection", return_value=False):
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "degraded"
        assert data["database_connected"] is False

