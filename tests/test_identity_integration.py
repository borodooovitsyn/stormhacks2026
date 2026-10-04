from fastapi.testclient import TestClient

from services.api.app.main import app

client = TestClient(app)


def test_pairing_links_worker_to_wallet_and_earnings_follow():
    pair = client.post("/devices/pair").json()
    code, worker_id = pair["code"], pair["worker_id"]
    assert pair["status"] == "pending"

    approved = client.post(f"/devices/pair/{code}/approve", json={"wallet": "MyWalletXYZ"}).json()
    assert approved["status"] == "approved"
    assert approved["worker_id"] == worker_id
    assert approved["wallet"] == "MyWalletXYZ"

    earn = client.get(f"/earnings/{worker_id}").json()
    assert earn["payout_wallet"] == "MyWalletXYZ"

    workers = client.get("/wallets/MyWalletXYZ/workers").json()
    assert worker_id in workers["worker_ids"]


def test_unlinked_worker_falls_back_to_default_wallet():
    earn = client.get("/earnings/some-unpaired-worker").json()
    assert earn["payout_wallet"]  # global default, not empty
