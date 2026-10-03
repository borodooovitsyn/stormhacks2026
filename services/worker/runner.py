"""Job runners. fake_run simulates a GPU job so the loop works with no GPU."""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import Iterator

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
) -> Iterator[Sample]:
    rng = random.Random(seed)
    elapsed = 0.0
    while elapsed < duration_seconds:
        step = min(interval_seconds, duration_seconds - elapsed)
        yield Sample(
            gpu_util_pct=round(rng.uniform(60.0, 99.0), 1),
            vram_used_mb=rng.randint(2000, 8000),
            cost_usd=interval_cost(step, rate_usd_per_hour),
        )
        elapsed += step
