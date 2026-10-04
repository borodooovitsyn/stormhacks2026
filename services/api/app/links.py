"""Identity links: account(email) <-> payout wallet <-> worker_id.

File-backed so paired devices and account links survive backend restarts.
Seed with ACCOUNTS / SEED_LINKS for demo providers.
"""

from __future__ import annotations

import json
from pathlib import Path

# Seed: demo accounts (email -> payable wallet). Fill with your 3 providers.
ACCOUNTS: dict[str, str] = {
    # "provider1@coreshare.dev": "<payable wallet 1>",
}

# Seed: pre-linked workers (worker_id -> payable wallet).
SEED_LINKS: dict[str, str] = {
    "worker-1": "2oUn6uDrZksDSW17DAvnfVMvkMTBJ2a9CQonfuEF9D6B",  # Payable 1
}

DEFAULT_PATH = Path.home() / ".coreshare" / "links.json"


class LinkStore:
    def __init__(
        self,
        accounts: dict[str, str] | None = None,
        links: dict[str, str] | None = None,
        path: Path | None = DEFAULT_PATH,
    ) -> None:
        self.path = path
        self._email_to_wallet = dict(accounts if accounts is not None else ACCOUNTS)
        self._worker_to_wallet = dict(links if links is not None else SEED_LINKS)
        self._load()

    def _load(self) -> None:
        if not self.path or not self.path.exists():
            return
        try:
            data = json.loads(self.path.read_text())
        except ValueError:
            return
        self._email_to_wallet.update(data.get("accounts", {}))
        self._worker_to_wallet.update(data.get("links", {}))

    def _save(self) -> None:
        if not self.path:
            return
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(
            json.dumps({"accounts": self._email_to_wallet, "links": self._worker_to_wallet}, indent=2)
        )

    def register_account(self, email: str, wallet: str) -> None:
        self._email_to_wallet[email] = wallet
        self._save()

    def wallet_for_email(self, email: str) -> str | None:
        return self._email_to_wallet.get(email)

    def link_worker(self, worker_id: str, wallet: str) -> None:
        self._worker_to_wallet[worker_id] = wallet
        self._save()

    def wallet_for_worker(self, worker_id: str) -> str | None:
        return self._worker_to_wallet.get(worker_id)

    def workers_for_wallet(self, wallet: str) -> list[str]:
        return [w for w, wal in self._worker_to_wallet.items() if wal == wallet]
