import json

from services.api.app.payouts import read_payouts


def test_groups_by_signature_for_wallet(tmp_path):
    state = {
        "settled": {
            "w1|100": {"bucket": 100, "cost_usd": "0.05", "payout_wallet": "WalletA", "signature": "sigA", "worker_id": "w1"},
            "w1|160": {"bucket": 160, "cost_usd": "0.05", "payout_wallet": "WalletA", "signature": "sigA", "worker_id": "w1"},
            "w1|220": {"bucket": 220, "cost_usd": "0.30", "payout_wallet": "WalletA", "signature": "sigB", "worker_id": "w1"},
            "w2|100": {"bucket": 100, "cost_usd": "0.99", "payout_wallet": "WalletB", "signature": "sigC", "worker_id": "w2"},
            "w1|300": {"bucket": 300, "cost_usd": "0.0", "payout_wallet": "WalletA", "signature": "sigZero", "worker_id": "w1"},
        }
    }
    p = tmp_path / "state.json"
    p.write_text(json.dumps(state))

    payouts = read_payouts("WalletA", path=p)

    # sigB (newest), then sigA; sigZero excluded (0 amount); sigC is another wallet.
    assert [x["signature"] for x in payouts] == ["sigB", "sigA"]
    assert payouts[0]["amount_sol"] == 0.30
    assert payouts[1]["amount_sol"] == 0.10


def test_missing_file_returns_empty(tmp_path):
    assert read_payouts("WalletA", path=tmp_path / "nope.json") == []
