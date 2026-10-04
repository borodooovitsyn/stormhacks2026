import io
import json
import zipfile
from pathlib import Path

from fastapi.testclient import TestClient

from services.api.app import main as api_main
from services.api.app.artifacts import ArtifactStore
from services.api.app.jobs import InMemoryJobQueue
from services.api.app.main import app
from services.worker.__main__ import execute_chunk, worker_storage_dir
from services.worker.client import BackendClient
from services.worker.loop import run_job_once
from services.worker.sandbox import SandboxResult


def test_worker_downloads_executes_and_returns_zip(monkeypatch, tmp_path):
    monkeypatch.setattr(api_main, "job_queue", InMemoryJobQueue())
    monkeypatch.setattr(api_main, "artifact_store", ArtifactStore(tmp_path / "storage"))
    http = TestClient(app)
    upload = http.post("/uploads?filename=meeting.mp3", content=b"mp3-payload").json()
    created = http.post(
        "/jobs",
        json={
            "job_type": "transcribe",
            "image": "gpu-share/whisper:cuda",
            "input_url": upload["input_url"],
            "total_units": 1,
            "requested_chunks": 1,
        },
    ).json()
    client = BackendClient(http)

    def sandbox(image, input_dir, output_dir, **options):
        assert image == "gpu-share/whisper:cuda"
        assert options["gpus"] is True
        assert (Path(input_dir) / "meeting.mp3").read_bytes() == b"mp3-payload"
        Path(output_dir, "transcript.txt").write_text("real transcript\n", encoding="utf-8")
        Path(output_dir, "transcript.json").write_text(
            json.dumps({"text": "real transcript", "language": "en"}),
            encoding="utf-8",
        )
        return SandboxResult(ok=True, stdout="transcribed (en): real transcript", stderr="")

    summary = run_job_once(
        client,
        "windows-gpu",
        rate_usd_per_hour=0.5,
        run_job=lambda chunk: execute_chunk(
            client,
            chunk,
            has_gpu=True,
            sandbox_runner=sandbox,
        ),
        sample=lambda: (75.0, 4096),
        clock=iter([0.0, 5.0]).__next__,
    )

    assert summary["ok"] is True
    status = http.get(f"/jobs/{created['job_id']}").json()
    assert status["status"] == "complete"
    archive = http.get(status["chunks"][0]["result_url"]).content
    with zipfile.ZipFile(io.BytesIO(archive)) as result:
        assert result.read("transcript.txt").decode("utf-8").splitlines() == ["real transcript"]
        assert json.loads(result.read("transcript.json"))["language"] == "en"


def test_worker_storage_dir_honors_override(monkeypatch, tmp_path):
    target = tmp_path / "worker-storage"
    monkeypatch.setenv("WORKER_STORAGE_DIR", str(target))

    assert worker_storage_dir() == target
