"""Usage metering: bill on measured time, not claims."""

from __future__ import annotations


def interval_cost(interval_seconds: float, rate_usd_per_hour: float) -> float:
    return rate_usd_per_hour * (interval_seconds / 3600.0)
