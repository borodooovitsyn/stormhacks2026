from services.api.app.links import LinkStore


def test_register_and_lookup_account():
    s = LinkStore(path=None)
    s.register_account("a@x.com", "WalletA")
    assert s.wallet_for_email("a@x.com") == "WalletA"
    assert s.wallet_for_email("missing@x.com") is None


def test_link_worker_to_wallet():
    s = LinkStore(path=None)
    s.link_worker("worker-1", "WalletA")
    assert s.wallet_for_worker("worker-1") == "WalletA"
    assert s.wallet_for_worker("unknown") is None


def test_workers_for_wallet():
    s = LinkStore(path=None)
    s.link_worker("worker-1", "WalletA")
    s.link_worker("worker-2", "WalletA")
    s.link_worker("worker-3", "WalletB")
    assert set(s.workers_for_wallet("WalletA")) == {"worker-1", "worker-2"}


def test_seeded_accounts():
    s = LinkStore(path=None, accounts={"seed@x.com": "SeedWallet"})
    assert s.wallet_for_email("seed@x.com") == "SeedWallet"
