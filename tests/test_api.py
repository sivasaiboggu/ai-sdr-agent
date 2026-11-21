"""Tests — API surface a deployment depends on: the /api prefix the
dashboard calls, CORS for the deployed frontend, and /health.
Regression tests: before v0.5.0 the dashboard's /api/chat, /api/campaigns
and /api/approve calls all 404'd (routes were bare-only), and a browser
on any other origin got its preflight rejected (no CORS middleware).
"""
from fastapi.testclient import TestClient

from backend.app.api import app

client = TestClient(app, raise_server_exceptions=False)


def test_health_and_api_health():
    for path in ("/health", "/api/health"):
        r = client.get(path)
        assert r.status_code == 200, path
        body = r.json()
        assert body["status"] == "ok"
        assert body["version"]
        assert body["database"] in ("sqlite", "postgres")
        # Health must not leak secrets or keys.
        assert "key" not in str(body).lower()
        assert "password" not in str(body).lower()
        # The dashboard's Gmail pill reads this boolean — it must be a
        # plain bool, never the credential itself.
        assert isinstance(body["gmail_configured"], bool)
        assert isinstance(body["gmail_send_enabled"], bool)


def test_api_prefix_mirrors_bare_routes():
    # No company in the message -> no agent run, just the help reply.
    for path in ("/chat", "/api/chat"):
        r = client.post(path, json={"message": "hello"})
        assert r.status_code == 200, path
        assert r.json()["drafts"] == []
    for path in ("/campaigns", "/api/campaigns"):
        r = client.get(path)
        assert r.status_code == 200, path
        assert "companies" in r.json() and "mails" in r.json()


def test_chat_validation():
    assert client.post("/api/chat", json={"message": ""}).status_code == 422
    assert client.post("/api/chat", json={"message": "x" * 1001}).status_code == 422


def test_cors_allows_configured_dev_origin():
    r = client.options(
        "/api/chat",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"
