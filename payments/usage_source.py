from dataclasses import dataclass
from decimal import Decimal
from typing import Protocol

import httpx


@dataclass(frozen=True)
class UsageRecord:
    worker_id: str
    payout_wallet: str
    bucket: int
    cost_usd: Decimal


@dataclass(frozen=True)
class EarningsResponse:
    worker_id: str
    payout_wallet: str
    earnings_today_usd: Decimal
    earnings_total_usd: Decimal
    series: list[dict]

    @classmethod
    def from_dict(cls, data: dict) -> "EarningsResponse":
        return cls(
            worker_id=data["worker_id"],
            payout_wallet=data["payout_wallet"],
            earnings_today_usd=Decimal(
                str(data["earnings_today_usd"])
            ),
            earnings_total_usd=Decimal(
                str(data["earnings_total_usd"])
            ),
            series=data["series"],
        )

    def to_usage_records(self) -> list[UsageRecord]:
        return [
            UsageRecord(
                worker_id=self.worker_id,
                payout_wallet=self.payout_wallet,
                bucket=item["bucket"],
                cost_usd=Decimal(str(item["cost_usd"])),
            )
            for item in self.series
        ]


class UsageSource(Protocol):
    async def get_usage(
        self,
        worker_id: str,
    ) -> list[UsageRecord]:
        ...


class HttpUsageSource:
    def __init__(
        self,
        base_url: str = "http://localhost:8000",
    ) -> None:
        self.client = httpx.AsyncClient(
            base_url=base_url,
            timeout=10.0,
        )

    async def get_usage(
        self,
        worker_id: str,
    ) -> list[UsageRecord]:
        response = await self.client.get(
            f"/earnings/{worker_id}"
        )

        response.raise_for_status()

        earnings = EarningsResponse.from_dict(
            response.json()
        )

        if earnings.worker_id != worker_id:
            raise ValueError(
                f"Requested worker {worker_id}, "
                f"but backend returned {earnings.worker_id}"
            )

        return earnings.to_usage_records()

    async def close(self) -> None:
        await self.client.aclose()