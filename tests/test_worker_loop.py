import pytest
from fastapi.testclient import TestClient

from services.api.app.main import app
from services.worker.client import BackendClient
from services.worker.loop import run_one
from services.worker.metering import interval_cost


def make_client():
    return BackendClient(TestClient(app))


def test_run_one_meters_every_interval():
    summary = run_one(
        make_client(), "w1",
        rate_usd_per_hour=0.50, duration_seconds=6, interval_seconds=2, seed=1,
    )
    assert summary["samples_reported"] == 3
    assert summary["total_cost_usd"] == pytest.approx(interval_cost(6, 0.50))


def test_run_one_claims_then_completes():
    summary = run_one(
        make_client(), "w1",
        rate_usd_per_hour=0.50, duration_seconds=2, interval_seconds=2, seed=1,
    )
    assert summary["chunk_id"]
    assert summary["completed"] is True


def test_run_one_paces_once_per_interval():
    calls = []
    run_one(
        make_client(), "w1",
        rate_usd_per_hour=0.50, duration_seconds=6, interval_seconds=2, seed=1,
        sleep=calls.append,
    )
    assert calls == [2, 2, 2]
