import pytest

from services.worker.metering import interval_cost


def test_full_hour_costs_the_hourly_rate():
    # Running for one hour at $0.50/hr should cost exactly $0.50.
    assert interval_cost(interval_seconds=3600, rate_usd_per_hour=0.50) == pytest.approx(0.50)


def test_partial_interval_is_prorated():
    # A 2-second sample at $0.50/hr costs rate * (2/3600).
    assert interval_cost(interval_seconds=2, rate_usd_per_hour=0.50) == pytest.approx(0.50 * 2 / 3600)


def test_zero_interval_costs_nothing():
    assert interval_cost(interval_seconds=0, rate_usd_per_hour=0.50) == 0.0
