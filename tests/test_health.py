from base58 import b58encode
from fastapi.testclient import TestClient
from nacl.signing import SigningKey

from services.api.app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_contract_endpoints_respond():
    """Every contract endpoint answers with the agreed shape (mock data)."""
    signing_key = SigningKey.generate()
    wallet = b58encode(bytes(signing_key.verify_key)).decode("ascii")
    nonce = client.post("/auth/nonce", json={"wallet": wallet}).json()["nonce"]
    signature = b58encode(signing_key.sign(nonce.encode("utf-8")).signature).decode("ascii")
    assert client.post(
        "/auth/verify",
        json={"wallet": wallet, "signature": signature},
    ).json()["token"]
    assert client.post("/devices/pair").json()["device_token"]

    claim = client.post("/workers/w1/claim").json()
    assert claim["chunk_id"] and claim["job_type"]

    metric = {"worker_id": "w1", "job_id": "j1", "gpu_util_pct": 80.0,
              "vram_used_mb": 4096, "cost_usd": 0.01}
    assert client.post("/metrics", json=metric).json()["accepted"] is True

    assert client.post(f"/chunks/{claim['chunk_id']}/complete").json()["status"] == "complete"

    earn = client.get("/earnings/w1").json()
    assert earn["payout_wallet"] and isinstance(earn["series"], list)
