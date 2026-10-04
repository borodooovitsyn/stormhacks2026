"""Identity links: account(email) <-> payout wallet <-> worker_id.

In-memory for the demo. `ACCOUNTS` is the seed of demo accounts — fill in the
four emails + their payout wallets here (or register at runtime).
"""

from __future__ import annotations

# Seed: demo accounts (email -> payable wallet). Fill with your 3 providers.
ACCOUNTS: dict[str, str] = {
    # "provider1@coreshare.dev": "<payable wallet 1>",
    # "provider2@coreshare.dev": "<payable wallet 2>",
    # "provider3@coreshare.dev": "<payable wallet 3>",
}

# Seed: pre-linked workers (worker_id -> payable wallet). Lets you run the payout
# demo with fixed worker ids (worker-1/2/3) without pairing 3 desktops.
SEED_LINKS: dict[str, str] = {
    # "worker-1": "<payable wallet 1>",
    # "worker-2": "<payable wallet 2>",
    # "worker-3": "<payable wallet 3>",
}


class LinkStore:
    def __init__(
        self,
        accounts: dict[str, str] | None = None,
        links: dict[str, str] | None = None,
    ) -> None:
        self._email_to_wallet: dict[str, str] = dict(accounts if accounts is not None else ACCOUNTS)
        self._worker_to_wallet: dict[str, str] = dict(links if links is not None else SEED_LINKS)

    def register_account(self, email: str, wallet: str) -> None:
        self._email_to_wallet[email] = wallet

    def wallet_for_email(self, email: str) -> str | None:
        return self._email_to_wallet.get(email)

    def link_worker(self, worker_id: str, wallet: str) -> None:
        self._worker_to_wallet[worker_id] = wallet

    def wallet_for_worker(self, worker_id: str) -> str | None:
        return self._worker_to_wallet.get(worker_id)

    def workers_for_wallet(self, wallet: str) -> list[str]:
        return [w for w, wal in self._worker_to_wallet.items() if wal == wallet]
