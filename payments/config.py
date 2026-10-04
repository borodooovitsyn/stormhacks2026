import os

# RPC_URL lets you swap in a faucet-friendly devnet endpoint (e.g. Helius) for airdrops.
DEVNET_RPC_URL = os.getenv("RPC_URL", "https://api.devnet.solana.com")


def get_payout_keypair_path() -> str:
    path = os.getenv("PAYOUT_KEYPAIR_PATH")

    if not path:
        raise RuntimeError("PAYOUT_KEYPAIR_PATH is not set")

    return path
