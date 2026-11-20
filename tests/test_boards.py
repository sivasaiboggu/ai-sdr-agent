"""Tests — boards registry, coverage dedupe, and the approve re-mail guard."""
import backend.app.api as api
import backend.app.boards as boards
from backend.app import memory as mem
from backend.app.api import app

from fastapi.testclient import TestClient

client = TestClient(app, raise_server_exceptions=False)

EXPECTED_BOARDS = {"builtin", "wellfound", "shine", "jobfound", "himalayas", "cutshort", "hiringcafe", "linkedin"}


def test_registry_covers_all_boards_and_never_internshala():
    got = boards.get_boards()
    assert {b["id"] for b in got} == EXPECTED_BOARDS
    assert len(got) == 8
    for b in got:
        assert b["name"] and b["url"].startswith("https://")
        assert b["focus"] and b["best_for"] and b["signin"] in ("signed-in", "not-signed-in", "browse-only")
        assert "internshala" not in (b["name"] + b["url"]).lower()
    assert all("internshala" not in b["id"] for b in got)


def test_boards_endpoint():
    for path in ("/boards", "/api/boards"):
        r = client.get(path)
        assert r.status_code == 200, path
        assert {b["id"] for b in r.json()["boards"]} == EXPECTED_BOARDS


def test_coverage_endpoint_shape_and_do_not_mail():
    for path in ("/coverage", "/api/coverage"):
        r = client.get(path)
        assert r.status_code == 200, path
        body = r.json()
        assert isinstance(body["companies"], list)
        assert {d["email"] for d in body["do_not_mail"]} == {
            "jobs@iion.io", "rthornton@eteaminc.com", "careers@hackshade.in", "careers@techsima.com",
        }
        for c in body["companies"]:
            assert c["status"] in ("researched", "mailed", "sent")
            assert c["sent"] <= c["mails"]


def _seed_db(tmp_path, sent_company=None):
    db = tmp_path / "cov.db"
    monkey_db = str(db)
    conn = mem.connect(monkey_db)
    mem.save_company(conn, "Acme Corp", "", "Test company", [])
    if sent_company:
        mem.save_mail(conn, sent_company, "Someone", "a@acme.test", "Hi", "body " * 20, "sent", "mid-1")
    conn.close()
    return monkey_db


def test_approve_guard_blocks_remail(tmp_path, monkeypatch):
    db = _seed_db(tmp_path, sent_company="Acme Corp")
    monkeypatch.setattr(mem, "DB_PATH", db)
    monkeypatch.setattr(api, "run_campaign", lambda *a, **k: (_ for _ in ()).throw(AssertionError("graph must not run")))
    r = client.post("/api/approve", json={"company": "acme corp", "approve": True})
    assert r.status_code == 409
    assert "Already sent" in r.json()["detail"]


def test_approve_guard_allows_first_send(tmp_path, monkeypatch):
    db = _seed_db(tmp_path, sent_company=None)
    monkeypatch.setattr(mem, "DB_PATH", db)
    monkeypatch.setattr(api, "run_campaign", lambda company, approve=True, dry_run=False: {
        "drafts": [{"to": "a@acme.test", "subject": "Hi", "body": "x"}],
        "sent": [{"to": "a@acme.test", "status": "sent"}],
    })
    r = client.post("/api/approve", json={"company": "Acme Corp", "approve": True})
    assert r.status_code == 200, r.text
    assert r.json()["sent"][0]["to"] == "a@acme.test"


def test_coverage_reflects_seeded_memory(tmp_path, monkeypatch):
    db = _seed_db(tmp_path, sent_company="Acme Corp")
    monkeypatch.setattr(mem, "DB_PATH", db)
    r = client.get("/api/coverage")
    assert r.status_code == 200
    acme = [c for c in r.json()["companies"] if c["name"] == "Acme Corp"]
    assert len(acme) == 1
    assert acme[0]["status"] == "sent" and acme[0]["sent"] == 1 and acme[0]["mails"] == 1
