"""Tests — POST /chat/stream (SSE): step events, streamed reply tokens,
done event with drafts, and the same validation as /chat. The agent run is
monkeypatched so the stream test is deterministic and offline."""
from fastapi.testclient import TestClient

import backend.app.api as api
from backend.app.api import app

client = TestClient(app, raise_server_exceptions=False)


def _fake_run(company, approve=False, dry_run=True):
    return {
        "profile": {"name": "iion", "summary": "Self-serve ad platform for gaming."},
        "mailable": [{"name": "Sanjaya Molligoda", "email": "sanjaya@iion.io"}],
        "drafts": [{"to": "sanjaya@iion.io", "name": "Sanjaya Molligoda",
                    "subject": "Hello", "body": "Hi Sanjaya,"}],
    }


def _events(body: str) -> list[tuple[str, dict]]:
    """Parse SSE frames into (event, payload) pairs."""
    import json
    out: list[tuple[str, dict]] = []
    event = ""
    for line in body.splitlines():
        if line.startswith("event:"):
            event = line[len("event:"):].strip()
        elif line.startswith("data:"):
            out.append((event, json.loads(line[len("data:"):].strip())))
            event = ""
    return out


def test_stream_happy_path(monkeypatch):
    monkeypatch.setattr(api, "run_campaign", _fake_run)
    with client.stream("POST", "/api/chat/stream", json={"message": "Research iion and draft mails"}) as r:
        assert r.status_code == 200
        assert "text/event-stream" in r.headers["content-type"]
        events = _events(r.read().decode())
    kinds = [e for e, _ in events]
    assert kinds[0] == "step"  # research starts before the run
    assert "step" in kinds and "token" in kinds and kinds[-1] == "done"
    done = dict(events)["done"]
    assert done["drafts"][0]["to"] == "sanjaya@iion.io"
    assert done["company"]["name"] == "iion"
    # The streamed tokens reassemble into exactly the done reply.
    streamed = "".join(p["text"] for e, p in events if e == "token")
    assert streamed == done["reply"]
    # Steps are the real pipeline stages, in order — research appears
    # twice (start, then done once the run finishes) so the chat step
    # indicator does not stall on "Research company".
    step_keys = [p["key"] for e, p in events if e == "step"]
    step_states = [p["state"] for e, p in events if e == "step"]
    assert step_keys == ["research", "research", "people", "writer", "approval"]
    assert step_states == ["start", "done", "done", "done", "done"]


def test_stream_no_company_returns_help_reply():
    with client.stream("POST", "/api/chat/stream", json={"message": "hello"}) as r:
        assert r.status_code == 200
        events = _events(r.read().decode())
    assert [e for e, _ in events] == ["done"]
    assert events[0][1]["drafts"] == []
    assert "Research iion" in events[0][1]["reply"]


def test_stream_agent_error_becomes_error_event(monkeypatch):
    def boom(*a, **k):
        raise ValueError("no such company")

    monkeypatch.setattr(api, "run_campaign", boom)
    with client.stream("POST", "/api/chat/stream", json={"message": "Research nope and draft mails"}) as r:
        assert r.status_code == 200
        events = _events(r.read().decode())
    assert events[-1][0] == "error"
    assert "no such company" in events[-1][1]["detail"]


def test_stream_validation_matches_chat():
    assert client.post("/api/chat/stream", json={"message": ""}).status_code == 422
    assert client.post("/api/chat/stream", json={"message": "x" * 1001}).status_code == 422
