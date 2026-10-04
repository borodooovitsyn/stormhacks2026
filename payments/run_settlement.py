import asyncio
import os

from payments.settlement import SettlementEngine
from payments.solana_clients import SolanaPaymentClient
from payments.state import SettlementState
from payments.usage_source import HttpUsageSource


SETTLEMENT_INTERVAL_SECONDS = 30
DEFAULT_BACKEND_URL = "http://localhost:8000"


def get_worker_ids() -> list[str]:
    raw = os.getenv("SETTLEMENT_WORKER_IDS")

    if not raw:
        raise RuntimeError(
            "SETTLEMENT_WORKER_IDS is not set"
        )

    worker_ids = [
        worker_id.strip()
        for worker_id in raw.split(",")
        if worker_id.strip()
    ]

    if not worker_ids:
        raise RuntimeError(
            "SETTLEMENT_WORKER_IDS contains no worker IDs"
        )

    return worker_ids


async def run_cycle(
    engine: SettlementEngine,
    worker_ids: list[str],
) -> None:
    for worker_id in worker_ids:
        try:
            result = await engine.settle_worker(worker_id)

            if result is None:
                print(
                    f"[{worker_id}] No unsettled usage"
                )
                continue

            print(
                f"[{worker_id}] Settlement successful"
            )
            print(
                f"  Payout wallet: {result.payout_wallet}"
            )
            print(
                f"  Amount: {result.amount_sol}"
            )
            print(
                f"  Records: {result.record_count}"
            )
            print(
                f"  Signature: {result.signature}"
            )

        except Exception as exc:
            print(
                f"[{worker_id}] Settlement failed: {exc}"
            )


async def run() -> None:
    worker_ids = get_worker_ids()

    backend_url = os.getenv(
        "BACKEND_URL",
        DEFAULT_BACKEND_URL,
    )

    payment_client = SolanaPaymentClient()

    usage_source = HttpUsageSource(
        base_url=backend_url,
    )

    state = SettlementState()

    engine = SettlementEngine(
        usage_source=usage_source,
        payment_client=payment_client,
        state=state,
    )

    print("Settlement service started")
    print(f"Backend: {backend_url}")
    print(f"Workers: {', '.join(worker_ids)}")
    print(
        f"Interval: {SETTLEMENT_INTERVAL_SECONDS} seconds"
    )

    try:
        while True:
            await run_cycle(
                engine=engine,
                worker_ids=worker_ids,
            )

            await asyncio.sleep(
                SETTLEMENT_INTERVAL_SECONDS
            )

    finally:
        await usage_source.close()
        await payment_client.close()


if __name__ == "__main__":
    asyncio.run(run())