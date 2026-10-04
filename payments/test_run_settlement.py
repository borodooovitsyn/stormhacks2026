import os
import unittest
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, call, patch

from payments.run_settlement import get_worker_ids, run_cycle
from payments.settlement import SettlementResult


class GetWorkerIdsTests(unittest.TestCase):
    def test_reads_worker_ids_from_environment(self) -> None:
        with patch.dict(
            os.environ,
            {
                "SETTLEMENT_WORKER_IDS": (
                    "worker-1, worker-2,worker-3"
                )
            },
            clear=False,
        ):
            worker_ids = get_worker_ids()

        self.assertEqual(
            worker_ids,
            [
                "worker-1",
                "worker-2",
                "worker-3",
            ],
        )

    def test_returns_empty_when_worker_ids_are_missing(self) -> None:
        # The missing-config error now surfaces in resolve_worker_ids, not here.
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(get_worker_ids(), [])


class RunCycleTests(unittest.IsolatedAsyncioTestCase):
    async def test_settles_every_worker(self) -> None:
        engine = SimpleNamespace(
            settle_worker=AsyncMock(
                return_value=None
            )
        )

        with patch("builtins.print"):
            await run_cycle(
                engine=engine,
                worker_ids=[
                    "worker-1",
                    "worker-2",
                ],
            )

        self.assertEqual(
            engine.settle_worker.await_args_list,
            [
                call("worker-1"),
                call("worker-2"),
            ],
        )

    async def test_failure_does_not_stop_other_workers(self) -> None:
        engine = SimpleNamespace(
            settle_worker=AsyncMock(
                side_effect=[
                    RuntimeError("payment failed"),
                    None,
                ]
            )
        )

        with patch("builtins.print"):
            await run_cycle(
                engine=engine,
                worker_ids=[
                    "worker-1",
                    "worker-2",
                ],
            )

        self.assertEqual(
            engine.settle_worker.await_count,
            2,
        )

        self.assertEqual(
            engine.settle_worker.await_args_list,
            [
                call("worker-1"),
                call("worker-2"),
            ],
        )

    async def test_handles_successful_settlement(self) -> None:
        result = SettlementResult(
            worker_id="worker-1",
            payout_wallet="ProviderWallet123",
            amount_sol=Decimal("0.003"),
            record_count=2,
            signature="signature-123",
        )

        engine = SimpleNamespace(
            settle_worker=AsyncMock(
                return_value=result
            )
        )

        with patch("builtins.print") as mock_print:
            await run_cycle(
                engine=engine,
                worker_ids=["worker-1"],
            )

        engine.settle_worker.assert_awaited_once_with(
            "worker-1"
        )

        mock_print.assert_any_call(
            "[worker-1] Settlement successful"
        )


if __name__ == "__main__":
    unittest.main()