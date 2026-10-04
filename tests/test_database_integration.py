import os
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import psycopg
import pytest

from services.api.app.database import DEFAULT_DATABASE_URL, MetricsRepository

pytestmark = pytest.mark.skipif(
    os.getenv("RUN_DB_TESTS") != "1",
    reason="set RUN_DB_TESTS=1 to run TimescaleDB integration tests",
)


def test_metrics_round_trip_through_timescaledb():
    database_url = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)
    worker_id = f"db-test-worker-{uuid4().hex}"
    job_id = f"db-test-job-{uuid4().hex}"
    metric_ts = datetime.now(UTC) - timedelta(minutes=5)
    refresh_start = metric_ts - timedelta(minutes=1)
    refresh_end = metric_ts + timedelta(minutes=2)

    repository = MetricsRepository(database_url=database_url, payout_wallet="TestWallet")

    try:
        repository.record_metric(
            worker_id=worker_id,
            job_id=job_id,
            gpu_util_pct=73.5,
            vram_used_mb=4096,
            cost_usd=0.012345,
            ts=metric_ts,
        )

        with psycopg.connect(database_url, autocommit=True) as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT gpu_util_pct, vram_used_mb, cost_usd
                FROM gpu_metrics
                WHERE worker_id = %s AND job_id = %s
                """,
                (worker_id, job_id),
            )
            metric = cur.fetchone()

        assert metric is not None
        assert metric[0] == 73.5
        assert metric[1] == 4096
        assert float(metric[2]) == pytest.approx(0.012345)

        # A fresh repository has no in-memory copy, so this result must come from TimescaleDB.
        earnings = MetricsRepository(
            database_url=database_url,
            payout_wallet="TestWallet",
        ).earnings(worker_id)

        assert earnings["earnings_total_usd"] == pytest.approx(0.012345)
        assert earnings["series"] == [
            {
                "bucket": int(metric_ts.timestamp() // 60 * 60),
                "cost_usd": pytest.approx(0.012345),
            }
        ]
    finally:
        with psycopg.connect(database_url, autocommit=True) as conn, conn.cursor() as cur:
            cur.execute("DELETE FROM gpu_metrics WHERE worker_id = %s", (worker_id,))
            cur.execute(
                "CALL refresh_continuous_aggregate('usage_per_minute', %s, %s)",
                (refresh_start, refresh_end),
            )
