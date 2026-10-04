import json
from decimal import Decimal
from pathlib import Path

from payments.usage_source import UsageRecord


DEFAULT_STATE_PATH = (
    Path.home()
    / ".gpu-share"
    / "settlement_state.json"
)


class SettlementState:
    def __init__(
        self,
        path: Path = DEFAULT_STATE_PATH,
    ) -> None:
        self.path = path
        self.data = self._load()

    def _load(self) -> dict:
        if not self.path.exists():
            return {"settled": {}}

        with self.path.open(
            "r",
            encoding="utf-8",
        ) as file:
            return json.load(file)

    def _save(self) -> None:
        self.path.parent.mkdir(
            parents=True,
            exist_ok=True,
        )

        temp_path = self.path.with_suffix(".tmp")

        with temp_path.open(
            "w",
            encoding="utf-8",
        ) as file:
            json.dump(
                self.data,
                file,
                indent=2,
                sort_keys=True,
            )

        temp_path.replace(self.path)

    @staticmethod
    def _record_key(
        record: UsageRecord,
    ) -> str:
        return f"{record.worker_id}|{record.bucket}"

    def get_unsettled(
        self,
        records: list[UsageRecord],
    ) -> list[UsageRecord]:
        unsettled = []

        for record in records:
            key = self._record_key(record)
            previous = self.data["settled"].get(key)

            if previous is None:
                unsettled.append(record)
                continue

            if previous["payout_wallet"] != record.payout_wallet:
                raise ValueError(
                    f"Payout wallet changed for {key}"
                )

            settled_cost = Decimal(
                previous["cost_usd"]
            )

            if record.cost_usd < settled_cost:
                raise ValueError(
                    f"Backend cost decreased for {key}"
                )

            remaining_cost = (
                record.cost_usd - settled_cost
            )

            if remaining_cost > 0:
                unsettled.append(
                    UsageRecord(
                        worker_id=record.worker_id,
                        payout_wallet=record.payout_wallet,
                        bucket=record.bucket,
                        cost_usd=remaining_cost,
                    )
                )

        return unsettled

    def mark_settled(
        self,
        records: list[UsageRecord],
        signature: str,
    ) -> None:
        for record in records:
            key = self._record_key(record)

            previous = self.data["settled"].get(key)

            if previous is None:
                total_settled = record.cost_usd
            else:
                total_settled = (
                    Decimal(previous["cost_usd"])
                    + record.cost_usd
                )

            self.data["settled"][key] = {
                "worker_id": record.worker_id,
                "payout_wallet": record.payout_wallet,
                "bucket": record.bucket,
                "cost_usd": str(total_settled),
                "signature": signature,
            }

        self._save()