"""Usage metering for the GPU worker.

We bill on measured usage, not on claims. Cost accrues per sampled interval:
each time we take a GPU sample we also record what that slice of time cost.
"""

from __future__ import annotations


def interval_cost(interval_seconds: float, rate_usd_per_hour: float) -> float:
    """Cost of running for `interval_seconds` at a given hourly rate."""
    return rate_usd_per_hour * (interval_seconds / 3600.0)
