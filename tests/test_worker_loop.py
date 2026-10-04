import pytest
from fastapi.testclient import TestClient

from services.api.app.main import app
from services.worker.client import BackendClient
from services.worker.loop import run_one
from services.worker.runner import Sample


def make_client():
    return BackendClient(TestClient(app))


def test_run_one_reports_every_sample_and_completes():
    samples = [Sample(80.0, 4096, 0.01), Sample(80.0, 4096, 0.01)]
    summary = run_one(make_client(), "w1", samples, interval_seconds=2)
    assert summary["samples_reported"] == 2
    assert summary["total_cost_usd"] == pytest.approx(0.02)
    assert summary["chunk_id"]
    assert summary["completed"] is True


def test_run_one_paces_once_per_sample():
    calls = []
    samples = [Sample(80.0, 4096, 0.0)] * 3
    run_one(make_client(), "w1", samples, interval_seconds=2, sleep=calls.append)
    assert calls == [2, 2, 2]


class _IdleClient:
    def __init__(self):
        self.reported = 0
        self.completed = []

    def claim(self, worker_id):
        return {"chunk_id": "", "job_id": "", "job_type": "idle", "input_url": ""}

    def report_metric(self, *a):
        self.reported += 1

    def complete(self, chunk_id):
        self.completed.append(chunk_id)


def test_run_one_skips_idle_claim():
    c = _IdleClient()
    summary = run_one(c, "w1", [Sample(80.0, 4096, 0.01)], interval_seconds=2)
    assert summary["idle"] is True
    assert c.reported == 0
    assert c.completed == []
