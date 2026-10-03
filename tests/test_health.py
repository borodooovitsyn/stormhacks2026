from fastapi.testclient import TestClient

from services.api.app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_contract_endpoints_respond():
    """Every contract endpoint answers with the agreed shape (mock data)."""
    assert client.post("/auth/nonce", json={"wallet": "w1"}).json()["nonce"]
    assert client.post("/auth/verify", json={"wallet": "w1", "signature": "s"}).json()["token"]
    assert client.post("/devices/pair").json()["device_token"]

    claim = client.post("/workers/w1/claim").json()
    assert claim["chunk_id"] and claim["job_type"]

    metric = {"worker_id": "w1", "job_id": "j1", "gpu_util_pct": 80.0,
              "vram_used_mb": 4096, "cost_usd": 0.01}
    assert client.post("/metrics", json=metric).json()["accepted"] is True

    assert client.post("/chunks/c1/complete").json()["status"] == "complete"

    earn = client.get("/earnings/w1").json()
    assert earn["payout_wallet"] and isinstance(earn["series"], list)
