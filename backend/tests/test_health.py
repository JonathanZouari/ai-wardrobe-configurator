from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app

ALLOWED = "http://localhost:5500"


def make_client() -> TestClient:
    settings = Settings(environment="test", cors_origins=ALLOWED)
    return TestClient(create_app(settings))


def test_health_returns_ok_in_standard_envelope():
    response = make_client().get("/api/health")

    assert response.status_code == 200
    assert response.json() == {
        "success": True,
        "data": {"status": "ok", "environment": "test"},
        "error": None,
    }


def test_cors_allows_configured_frontend_origin():
    response = make_client().get("/api/health", headers={"Origin": ALLOWED})

    assert response.headers["access-control-allow-origin"] == ALLOWED


def test_cors_does_not_allow_unknown_origin():
    response = make_client().get("/api/health", headers={"Origin": "http://evil.example"})

    assert "access-control-allow-origin" not in response.headers


def test_cors_origins_are_parsed_from_comma_separated_value():
    settings = Settings(cors_origins="http://a.test, http://b.test ,")

    assert settings.cors_origin_list == ["http://a.test", "http://b.test"]


def test_unknown_route_returns_404_without_leaking_internals():
    response = make_client().get("/api/does-not-exist")

    assert response.status_code == 404
    assert response.json() == {"success": False, "data": None, "error": "Not Found"}
