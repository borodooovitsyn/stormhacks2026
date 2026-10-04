"""Renter credit balance: SOL deposited into escrow, tracked per wallet.

File-backed so credits survive backend restarts.
"""

from __future__ import annotations

import json
from pathlib import Path

DEFAULT_PATH = Path.home() / ".coreshare" / "credits.json"


class CreditLedger:
    def __init__(self, path: Path | None = DEFAULT_PATH) -> None:
        self.path = path
        self._balance: dict[str, float] = {}
        self._seen: set[str] = set()
        self._load()

    def _load(self) -> None:
        if not self.path or not self.path.exists():
            return
        try:
            data = json.loads(self.path.read_text())
        except ValueError:
            return
        self._balance = data.get("balance", {})
        self._seen = set(data.get("seen", []))

    def _save(self) -> None:
        if not self.path:
            return
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps({"balance": self._balance, "seen": sorted(self._seen)}, indent=2))

    def balance(self, wallet: str) -> float:
        return round(self._balance.get(wallet, 0.0), 6)

    def deposit(self, wallet: str, amount: float, signature: str) -> float:
        if signature not in self._seen:
            self._seen.add(signature)
            self._balance[wallet] = self._balance.get(wallet, 0.0) + amount
            self._save()
        return self.balance(wallet)
