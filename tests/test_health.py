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


def test_job_status_includes_container_image():
    created = client.post(
        "/jobs",
        json={
            "job_type": "blender",
            "image": "gpu-share/blender:cuda",
            "input_url": "mock://demo/scene.blend",
            "total_units": 20,
            "requested_chunks": 4,
        },
    ).json()

    assert created["image"] == "gpu-share/blender:cuda"
    status = client.get(f"/jobs/{created['job_id']}").json()
    assert status["image"] == "gpu-share/blender:cuda"
    assert status["chunk_count"] == 4
    assert status["chunks"][0]["image"] == "gpu-share/blender:cuda"


def test_desktop_download_endpoint_serves_windows_app(monkeypatch, tmp_path):
    installer = tmp_path / "CoreWhore-0.1.1-Windows-x64-Portable.exe"
    installer.write_bytes(b"MZ-fake-installer")
    monkeypatch.setenv("DESKTOP_DOWNLOAD_PATH", str(installer))

    response = client.get("/downloads/desktop")

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/vnd.microsoft.portable-executable"
    assert "-Windows-x64-Portable.exe" in response.headers["content-disposition"]
    assert response.content.startswith(b"MZ")
