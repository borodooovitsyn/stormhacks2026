from dataclasses import dataclass
from decimal import Decimal

import httpx


@dataclass(frozen=True)
class UsageRecord:
    worker_id: str
    payout_wallet: str
    bucket: str
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