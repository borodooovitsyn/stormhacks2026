from services.api.app.credits import CreditLedger
from services.api.app.links import LinkStore


def test_links_persist_across_instances(tmp_path):
    p = tmp_path / "links.json"
    a = LinkStore(path=p)
    a.link_worker("worker-x", "WalletA")
    a.register_account("e@x.com", "WalletA")

    b = LinkStore(path=p)  # fresh instance, same file
    assert b.wallet_for_worker("worker-x") == "WalletA"
    assert b.wallet_for_email("e@x.com") == "WalletA"


def test_credits_persist_across_instances(tmp_path):
    p = tmp_path / "credits.json"
    a = CreditLedger(path=p)
    a.deposit("WalletA", 3.0, "sig1")

    b = CreditLedger(path=p)
    assert b.balance("WalletA") == 3.0
    # idempotency survives too
    assert b.deposit("WalletA", 3.0, "sig1") == 3.0
