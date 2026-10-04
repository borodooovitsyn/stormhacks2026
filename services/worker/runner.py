"""Job runners. fake_run simulates a GPU job so the loop works with no GPU."""

from __future__ import annotations

import random
from collections.abc import Callable, Iterator
from dataclasses import dataclass

from services.worker.gpu import sample_gpu
from services.worker.metering import interval_cost


@dataclass
class Sample:
    gpu_util_pct: float
    vram_used_mb: int
    cost_usd: float


def fake_run(
    duration_seconds: float,
    interval_seconds: float,
    rate_usd_per_hour: float,
    seed: int | None = None,
    max_util: float = 100.0,
) -> Iterator[Sample]:
    rng = random.Random(seed)
    elapsed = 0.0
    while elapsed < duration_seconds:
        step = min(interval_seconds, duration_seconds - elapsed)
        util = round(rng.uniform(max_util * 0.6, max_util), 1)
        yield Sample(
            gpu_util_pct=util,
            vram_used_mb=rng.randint(2000, 8000),
            cost_usd=interval_cost(step, rate_usd_per_hour, util),
        )
        elapsed += step


def gpu_run(
    duration_seconds: float,
    interval_seconds: float,
    rate_usd_per_hour: float,
    sample: Callable[[], tuple[float, int]] = sample_gpu,
) -> Iterator[Sample]:
    elapsed = 0.0
    while elapsed < duration_seconds:
        step = min(interval_seconds, duration_seconds - elapsed)
        util, vram = sample()
        yield Sample(gpu_util_pct=util, vram_used_mb=vram, cost_usd=interval_cost(step, rate_usd_per_hour, util))
        elapsed += step
