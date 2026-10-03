import jwt
from base58 import b58encode
from nacl.signing import SigningKey

from services.api.app.auth import AuthService
from services.api.app.pairing import PairingStore


def _wallet_and_signature(message: str) -> tuple[str, str]:
    signing_key = SigningKey.generate()
    wallet = b58encode(bytes(signing_key.verify_key)).decode("ascii")
    signature = b58encode(signing_key.sign(message.encode("utf-8")).signature).decode("ascii")
    return wallet, signature


def test_auth_service_verifies_solana_signature_and_mints_jwt():
    service = AuthService(
        jwt_secret="test-secret-with-at-least-32-bytes",
        nonce_ttl_seconds=60,
        token_ttl_seconds=60,
        allow_dev_signatures=False,
    )
    signing_key = SigningKey.generate()
    wallet = b58encode(bytes(signing_key.verify_key)).decode("ascii")
    nonce = service.create_nonce(wallet)
    signature = b58encode(signing_key.sign(nonce.encode("utf-8")).signature).decode("ascii")

    token = service.verify_and_mint(wallet, signature)

    claims = jwt.decode(token, "test-secret-with-at-least-32-bytes", algorithms=["HS256"])
    assert claims["wallet"] == wallet
    assert claims["scope"] == "wallet"


def test_auth_service_rejects_bad_signature():
    service = AuthService(
        jwt_secret="test-secret-with-at-least-32-bytes",
        allow_dev_signatures=False,
    )
    wallet, _signature = _wallet_and_signature("not the nonce")
    service.create_nonce(wallet)
    _other_wallet, bad_signature = _wallet_and_signature("wrong message")

    try:
        service.verify_and_mint(wallet, bad_signature)
    except Exception as exc:
        assert "signature verification failed" in str(exc)
    else:
        raise AssertionError("bad signature should not verify")


def test_pairing_starts_pending_and_can_be_approved():
    store = PairingStore(ttl_seconds=60)

    session = store.create()

    assert session.status == "pending"

    approved = store.approve(session.code, "Wallet111")

    assert approved is not None
    assert approved.status == "approved"
    assert store.get(session.code).device_token == session.device_token
