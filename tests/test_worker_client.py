from fastapi.testclient import TestClient

from services.api.app.main import app
from services.worker.client import BackendClient
from services.worker.runner import Sample


def make_client():
    http = TestClient(app)
    http.post(
        "/jobs",
        json={
            "job_type": "whisper",
            "image": "gpu-share/whisper:cuda",
            "input_url": "/uploads/test-input",
            "total_units": 1,
            "requested_chunks": 1,
        },
    ).raise_for_status()
    return BackendClient(http)


def test_claim_returns_a_chunk():
    chunk = make_client().claim("w1")
    assert chunk["chunk_id"]
    assert chunk["job_type"]


def test_report_metric_is_accepted():
    sample = Sample(gpu_util_pct=80.0, vram_used_mb=4096, cost_usd=0.01)
    resp = make_client().report_metric("w1", "j1", sample)
    assert resp["accepted"] is True


def test_fail_marks_chunk_failed():
    client = make_client()
    chunk = client.claim("w1")
    resp = client.fail(chunk["chunk_id"], "container failed")
    assert resp["status"] == "failed"
    assert resp["error"] == "container failed"
