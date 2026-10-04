"""Metrics persistence and earnings reads for Tiger Data / TimescaleDB."""

from __future__ import annotations

import os
from collections import defaultdict
from dataclasses import dataclass
from datetime import UTC, datetime, time
from decimal import Decimal
from threading import Lock
from typing import Any

try:
    import psycopg
    from psycopg.rows import dict_row
except ImportError:  # pragma: no cover - dependency is installed by make setup
    psycopg = None
    dict_row = None


DEFAULT_DATABASE_URL = "postgresql://postgres:postgres@localhost:5433/gpushare"
DEFAULT_PAYOUT_WALLET = "2oUn6uDrZksDSW17DAvnfVMvkMTBJ2a9CQonfuEF9D6B"


@dataclass
class MetricRecord:
    worker_id: str
    job_id: str
    gpu_util_pct: float
    vram_used_mb: int
    cost_usd: Decimal
    ts: datetime


def normalize_ts(value: datetime | str | None) -> datetime:
    if value is None:
        return datetime.now(UTC)

    if isinstance(value, datetime):
        ts = value
    else:
        raw = value.strip()
        if raw.endswith("Z"):
            raw = raw[:-1] + "+00:00"
        ts = datetime.fromisoformat(raw)

    if ts.tzinfo is None:
        return ts.replace(tzinfo=UTC)
    return ts.astimezone(UTC)


class MetricsRepository:
    def __init__(
        self,
        database_url: str | None = None,
        payout_wallet: str | None = None,
    ) -> None:
        self.database_url = database_url if database_url is not None else os.getenv(
            "DATABASE_URL",
            DEFAULT_DATABASE_URL,
        )
        self.payout_wallet = payout_wallet or os.getenv(
            "DEFAULT_PAYOUT_WALLET",
            DEFAULT_PAYOUT_WALLET,
        )
        self._lock = Lock()
        self._memory: list[MetricRecord] = []

    def record_metric(
        self,
        *,
        worker_id: str,
        job_id: str,
        gpu_util_pct: float,
        vram_used_mb: int,
        cost_usd: float,
        ts: datetime | str | None,
    ) -> datetime:
        record = MetricRecord(
            worker_id=worker_id,
            job_id=job_id,
            gpu_util_pct=gpu_util_pct,
            vram_used_mb=vram_used_mb,
            cost_usd=Decimal(str(cost_usd)),
            ts=normalize_ts(ts),
        )

        with self._lock:
            self._memory.append(record)

        self._insert_db(record)
        return record.ts

    def earnings(self, worker_id: str) -> dict[str, Any]:
        db_result = self._earnings_db(worker_id)
        if db_result is not None and (db_result["series"] or not self._has_memory(worker_id)):
            return db_result
        return self._earnings_memory(worker_id)

    def _has_memory(self, worker_id: str) -> bool:
        with self._lock:
            return any(record.worker_id == worker_id for record in self._memory)

    def _connect(self):
        if psycopg is None or not self.database_url:
            return None
        try:
            return psycopg.connect(self.database_url, autocommit=True, connect_timeout=1)
        except psycopg.Error:
            return None

    def _insert_db(self, record: MetricRecord) -> None:
        conn = self._connect()
        if conn is None:
            return

        with conn, conn.cursor() as cur:
            cur.execute(
                """
                    INSERT INTO gpu_metrics (
                        ts, worker_id, job_id, gpu_util_pct, vram_used_mb, cost_usd
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                (
                    record.ts,
                    record.worker_id,
                    record.job_id,
                    record.gpu_util_pct,
                    record.vram_used_mb,
                    record.cost_usd,
                ),
            )

    def _earnings_db(self, worker_id: str) -> dict[str, Any] | None:
        conn = self._connect()
        if conn is None:
            return None

        with conn, conn.cursor(row_factory=dict_row) as cur:
            self._refresh_usage_per_minute(cur)
            cur.execute(
                """
                    SELECT
                        EXTRACT(EPOCH FROM bucket)::BIGINT AS bucket,
                        ROUND(SUM(cost_usd)::NUMERIC, 6)::FLOAT AS cost_usd
                    FROM usage_per_minute
                    WHERE worker_id = %s
                    GROUP BY bucket
                    ORDER BY bucket
                    """,
                (worker_id,),
            )
            series = [
                {"bucket": row["bucket"], "cost_usd": round(float(row["cost_usd"]), 6)}
                for row in cur.fetchall()
            ]

            cur.execute(
                """
                    SELECT COALESCE(SUM(cost_usd), 0)::FLOAT AS total
                    FROM usage_per_minute
                    WHERE worker_id = %s
                    """,
                (worker_id,),
            )
            total = float(cur.fetchone()["total"])

            cur.execute(
                """
                    SELECT COALESCE(SUM(cost_usd), 0)::FLOAT AS today
                    FROM usage_per_minute
                    WHERE worker_id = %s
                      AND bucket >= date_trunc('day', now() AT TIME ZONE 'utc')
                    """,
                (worker_id,),
            )
            today = float(cur.fetchone()["today"])

        return {
            "worker_id": worker_id,
            "payout_wallet": self.payout_wallet,
            "earnings_today_usd": round(today, 6),
            "earnings_total_usd": round(total, 6),
            "series": series,
        }

    @staticmethod
    def _refresh_usage_per_minute(cur) -> None:
        try:
            cur.execute(
                """
                CALL refresh_continuous_aggregate(
                    'usage_per_minute',
                    now() - INTERVAL '2 days',
                    now()
                )
                """
            )
        except psycopg.Error:
            # Local dev should still be able to read the last materialized data
            # if a refresh policy or Timescale permissions get in the way.
            cur.connection.rollback()

    def _earnings_memory(self, worker_id: str) -> dict[str, Any]:
        buckets: dict[int, Decimal] = defaultdict(lambda: Decimal(0))
        today = Decimal(0)
        total = Decimal(0)
        today_start = datetime.combine(datetime.now(UTC).date(), time.min, UTC)

        with self._lock:
            records = [record for record in self._memory if record.worker_id == worker_id]

        for record in records:
            bucket = int(record.ts.timestamp() // 60 * 60)
            buckets[bucket] += record.cost_usd
            total += record.cost_usd
            if record.ts >= today_start:
                today += record.cost_usd

        series = [
            {"bucket": bucket, "cost_usd": round(float(cost), 6)}
            for bucket, cost in sorted(buckets.items())
        ]
        return {
            "worker_id": worker_id,
            "payout_wallet": self.payout_wallet,
            "earnings_today_usd": round(float(today), 6),
            "earnings_total_usd": round(float(total), 6),
            "series": series,
        }
