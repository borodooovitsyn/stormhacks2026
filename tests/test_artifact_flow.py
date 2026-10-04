from fastapi.testclient import TestClient

from services.api.app import main as api_main
from services.api.app.artifacts import ArtifactStore
from services.api.app.jobs import InMemoryJobQueue
from services.api.app.main import app
from services.worker.client import BackendClient


def test_input_and_result_round_trip(monkeypatch, tmp_path):
    monkeypatch.setattr(api_main, "job_queue", InMemoryJobQueue())
    monkeypatch.setattr(api_main, "artifact_store", ArtifactStore(tmp_path / "storage"))
    http = TestClient(app)

    upload = http.post(
        "/uploads?filename=recording.mp3",
        content=b"real-mp3-payload",
        headers={"Content-Type": "audio/mpeg"},
    )
    assert upload.status_code == 200

    created = http.post(
        "/jobs",
        json={
            "job_type": "transcribe",
            "image": "gpu-share/whisper:cuda",
            "input_url": upload.json()["input_url"],
            "total_units": 1,
            "requested_chunks": 1,
        },
    )
    assert created.status_code == 200

    worker = BackendClient(http)
    chunk = worker.claim("windows-gpu")
    input_dir = tmp_path / "worker-input"
    input_dir.mkdir()
    downloaded = worker.download_input(chunk["input_url"], input_dir)
    assert downloaded.name == "recording.mp3"
    assert downloaded.read_bytes() == b"real-mp3-payload"

    archive = tmp_path / "result.zip"
    archive.write_bytes(b"real-zip-payload")
    worker.upload_result(chunk["chunk_id"], archive)
    worker.complete(chunk["chunk_id"])

    status = http.get(f"/jobs/{created.json()['job_id']}").json()
    assert status["status"] == "complete"
    assert status["chunks"][0]["result_url"] == f"/chunks/{chunk['chunk_id']}/result"
    downloaded_result = http.get(status["chunks"][0]["result_url"])
    assert downloaded_result.content == b"real-zip-payload"


def test_chunk_cannot_complete_without_result(monkeypatch, tmp_path):
    monkeypatch.setattr(api_main, "job_queue", InMemoryJobQueue())
    monkeypatch.setattr(api_main, "artifact_store", ArtifactStore(tmp_path))
    http = TestClient(app)
    created = http.post(
        "/jobs",
        json={
            "job_type": "transcribe",
            "image": "gpu-share/whisper:cuda",
            "input_url": "/uploads/missing",
            "total_units": 1,
            "requested_chunks": 1,
        },
    ).json()
    chunk = http.post("/workers/windows-gpu/claim").json()

    response = http.post(f"/chunks/{chunk['chunk_id']}/complete")

    assert response.status_code == 409
    assert http.get(f"/jobs/{created['job_id']}").json()["status"] == "running"
