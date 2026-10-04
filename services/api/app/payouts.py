"""Read real devnet payouts from the settlement state file (written by payments)."""

from __future__ import annotations

import json
from collections import defaultdict
from decimal import Decimal
from pathlib import Path

DEFAULT_STATE_PATH = Path.home() / ".gpu-share" / "settlement_state.json"


def read_payouts(wallet: str, path: Path = DEFAULT_STATE_PATH) -> list[dict]:
    try:
        data = json.loads(Path(path).read_text())
    except (FileNotFoundError, ValueError):
        return []

    grouped: dict[str, dict] = defaultdict(lambda: {"amount": Decimal(0), "ts": 0})
    for rec in data.get("settled", {}).values():
        if rec.get("payout_wallet") != wallet:
            continue
        sig = rec["signature"]
        grouped[sig]["amount"] += Decimal(str(rec["cost_usd"]))
        grouped[sig]["ts"] = max(grouped[sig]["ts"], rec["bucket"])

    payouts = [
        {"signature": sig, "amount_sol": float(v["amount"]), "ts": v["ts"]}
        for sig, v in grouped.items()
        if v["amount"] > 0
    ]
    payouts.sort(key=lambda p: p["ts"], reverse=True)
    return payouts
