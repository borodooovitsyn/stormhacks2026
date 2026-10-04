"""Usage metering for billable worker execution time."""

from __future__ import annotations


def interval_cost(interval_seconds: float, rate_usd_per_hour: float, gpu_util_pct: float = 100.0) -> float:
    return rate_usd_per_hour * (gpu_util_pct / 100.0) * (interval_seconds / 3600.0)
