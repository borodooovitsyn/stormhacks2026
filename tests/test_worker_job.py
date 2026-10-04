import pytest

from services.worker.loop import run_job_once
from services.worker.metering import interval_cost


class SpyClient:
    def __init__(self):
        self.metrics = []
        self.completed = []
        self.failed = []

    def claim(self, worker_id):
        return {"chunk_id": "c1", "job_id": "j1", "job_type": "whisper"}

    def report_metric(self, worker_id, job_id, sample):
        self.metrics.append(sample)

    def complete(self, chunk_id):
        self.completed.append(chunk_id)

    def fail(self, chunk_id, error):
        self.failed.append((chunk_id, error))


def test_meters_successful_execution_time_and_completes():
    spy = SpyClient()
    clock = iter([10.0, 15.0]).__next__  # start=10, end=15 -> 5s elapsed
    summary = run_job_once(
        spy, "w1",
        rate_usd_per_hour=0.50,
        run_job=lambda chunk: True,
        sample=lambda: (90.0, 5000),
        clock=clock,
    )
    assert summary["seconds"] == 5.0
    assert summary["cost_usd"] == pytest.approx(interval_cost(5.0, 0.50))
    assert spy.completed == ["c1"]
    assert len(spy.metrics) == 1
    assert spy.metrics[0].cost_usd == pytest.approx(interval_cost(5.0, 0.50))
    assert spy.metrics[0].gpu_util_pct == 90.0


def test_zero_post_job_utilization_does_not_erase_earnings():
    spy = SpyClient()
    summary = run_job_once(
        spy,
        "w1",
        rate_usd_per_hour=0.50,
        run_job=lambda chunk: True,
        sample=lambda: (0.0, 0),
        clock=iter([0.0, 10.0]).__next__,
    )
    assert summary["cost_usd"] == pytest.approx(interval_cost(10.0, 0.50))
    assert spy.metrics[0].gpu_util_pct == 0.0


class IdleSpy(SpyClient):
    def claim(self, worker_id):
        return {"chunk_id": "", "job_id": "", "job_type": "idle", "input_url": ""}


def test_run_job_once_skips_idle_claim():
    spy = IdleSpy()
    ran = []
    summary = run_job_once(
        spy, "w1",
        rate_usd_per_hour=0.50,
        run_job=lambda c: ran.append(1) or True,
        sample=lambda: (0.0, 0),
        clock=iter([0.0, 1.0]).__next__,
    )
    assert summary["idle"] is True
    assert ran == []
    assert spy.completed == []


def test_failed_job_is_reported_and_not_completed():
    spy = SpyClient()
    summary = run_job_once(
        spy, "w1",
        rate_usd_per_hour=0.50,
        run_job=lambda chunk: False,
        sample=lambda: (0.0, 0),
        clock=iter([0.0, 2.0]).__next__,
    )
    assert summary["ok"] is False
    assert summary["cost_usd"] == 0.0
    assert spy.completed == []
    assert spy.failed == [("c1", "workload failed")]


def test_job_exception_is_sent_to_backend():
    spy = SpyClient()
    summary = run_job_once(
        spy,
        "w1",
        rate_usd_per_hour=0.50,
        run_job=lambda chunk: (_ for _ in ()).throw(RuntimeError("docker exploded")),
        sample=lambda: (0.0, 0),
        clock=iter([0.0, 2.0]).__next__,
    )
    assert summary["ok"] is False
    assert spy.failed == [("c1", "docker exploded")]
