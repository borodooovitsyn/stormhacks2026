from dataclasses import dataclass
from decimal import Decimal

from payments.solana_clients import SolanaPaymentClient
from payments.state import SettlementState
from payments.usage_source import UsageSource


@dataclass(frozen=True)
class SettlementResult:
    worker_id: str
    payout_wallet: str
    amount_sol: Decimal
    record_count: int
    signature: str


class SettlementEngine:
    def __init__(
        self,
        usage_source: UsageSource,
        payment_client: SolanaPaymentClient,
        state: SettlementState,
    ) -> None:
        self.usage_source = usage_source
        self.payment_client = payment_client
        self.state = state

    async def settle_worker(
        self,
        worker_id: str,
    ) -> SettlementResult | None:

        records = await self.usage_source.get_usage(worker_id)

        unsettled = self.state.get_unsettled(records)

        if not unsettled:
            return None

        payout_wallets = {
            record.payout_wallet
            for record in unsettled
        }

        if len(payout_wallets) != 1:
            raise ValueError(
                f"Worker {worker_id} has multiple payout wallets"
            )

        payout_wallet = unsettled[0].payout_wallet

        amount_sol = sum(
            (
                record.cost_usd
                for record in unsettled
            ),
            Decimal("0"),
        )

        if amount_sol <= 0:
            return None

        signature = await self.payment_client.pay(
            dest_wallet=payout_wallet,
            amount_sol=amount_sol,
        )

        self.state.mark_settled(
            unsettled,
            signature,
        )

        return SettlementResult(
            worker_id=worker_id,
            payout_wallet=payout_wallet,
            amount_sol=amount_sol,
            record_count=len(unsettled),
            signature=signature,
        )