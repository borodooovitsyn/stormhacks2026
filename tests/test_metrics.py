from services.api.app.database import MetricsRepository


def test_memory_metrics_roll_up_by_minute():
    repo = MetricsRepository(database_url="", payout_wallet="Wallet111")

    repo.record_metric(
        worker_id="worker-1",
        job_id="job-1",
        gpu_util_pct=80,
        vram_used_mb=4096,
        cost_usd=0.01,
        ts="2026-10-03T12:00:05+00:00",
    )
    repo.record_metric(
        worker_id="worker-1",
        job_id="job-1",
        gpu_util_pct=90,
        vram_used_mb=5120,
        cost_usd=0.02,
        ts="2026-10-03T12:00:50+00:00",
    )

    earnings = repo.earnings("worker-1")

    assert earnings["worker_id"] == "worker-1"
    assert earnings["payout_wallet"] == "Wallet111"
    assert earnings["earnings_total_usd"] == 0.03
    assert earnings["series"] == [{"bucket": 1791028800, "cost_usd": 0.03}]


def test_memory_metrics_are_worker_scoped():
    repo = MetricsRepository(database_url="")

    repo.record_metric(
        worker_id="worker-1",
        job_id="job-1",
        gpu_util_pct=80,
        vram_used_mb=4096,
        cost_usd=0.01,
        ts="2026-10-03T12:00:05+00:00",
    )

    earnings = repo.earnings("worker-2")

    assert earnings["earnings_total_usd"] == 0
    assert earnings["series"] == []
