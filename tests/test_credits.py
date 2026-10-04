from services.api.app.credits import CreditLedger


def test_starts_at_zero():
    assert CreditLedger(path=None).balance("W") == 0.0


def test_deposit_adds_and_is_idempotent_per_signature():
    led = CreditLedger(path=None)
    assert led.deposit("W", 1.5, "sig1") == 1.5
    assert led.deposit("W", 2.0, "sig2") == 3.5
    # same signature twice -> not double-counted
    assert led.deposit("W", 2.0, "sig2") == 3.5
