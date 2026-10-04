import os

DEVNET_RPC_URL = "https://api.devnet.solana.com"


def get_payout_keypair_path() -> str:
    path = os.getenv("PAYOUT_KEYPAIR_PATH")

    if not path:
        raise RuntimeError("PAYOUT_KEYPAIR_PATH is not set")

    return path