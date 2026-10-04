import pytest

from services.worker.metering import interval_cost
from services.worker.runner import fake_run, gpu_run


def test_yields_one_sample_per_interval():
    samples = list(fake_run(duration_seconds=6, interval_seconds=2, rate_usd_per_hour=0.50))
    assert len(samples) == 3


def test_total_cost_matches_metered_duration():
    samples = list(fake_run(duration_seconds=6, interval_seconds=2, rate_usd_per_hour=0.50))
    total = sum(s.cost_usd for s in samples)
    assert total == pytest.approx(interval_cost(6, 0.50))


def test_samples_report_plausible_utilization():
    samples = list(fake_run(duration_seconds=4, interval_seconds=2, rate_usd_per_hour=0.50, seed=1))
    for s in samples:
        assert 0.0 <= s.gpu_util_pct <= 100.0
        assert s.vram_used_mb > 0


def test_same_seed_is_reproducible():
    a = list(fake_run(duration_seconds=4, interval_seconds=2, rate_usd_per_hour=0.50, seed=42))
    b = list(fake_run(duration_seconds=4, interval_seconds=2, rate_usd_per_hour=0.50, seed=42))
    assert [s.gpu_util_pct for s in a] == [s.gpu_util_pct for s in b]


def test_gpu_run_uses_sampled_values():
    samples = list(gpu_run(
        duration_seconds=4, interval_seconds=2, rate_usd_per_hour=0.50,
        sample=lambda: (90.0, 5000),
    ))
    assert len(samples) == 2
    assert all(s.gpu_util_pct == 90.0 and s.vram_used_mb == 5000 for s in samples)


def test_gpu_run_meters_cost():
    samples = list(gpu_run(
        duration_seconds=4, interval_seconds=2, rate_usd_per_hour=0.50,
        sample=lambda: (90.0, 5000),
    ))
    assert sum(s.cost_usd for s in samples) == pytest.approx(interval_cost(4, 0.50))
