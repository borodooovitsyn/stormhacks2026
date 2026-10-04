import unittest
from decimal import Decimal

from payments.usage_source import EarningsResponse, UsageRecord


class EarningsResponseTests(unittest.TestCase):
    def test_from_dict_converts_backend_response(self) -> None:
        data = {
            "worker_id": "job-4a8ec471",
            "payout_wallet": "DevnetProviderWallet111111111111111111111111",
            "earnings_today_usd": 0.03,
            "earnings_total_usd": 0.15,
            "series": [
                {
                    "bucket": "2026-10-03T19:50:00Z",
                    "cost_usd": 0.01,
                },
                {
                    "bucket": "2026-10-03T19:51:00Z",
                    "cost_usd": 0.02,
                },
            ],
        }

        earnings = EarningsResponse.from_dict(data)

        self.assertEqual(earnings.worker_id, "job-4a8ec471")
        self.assertEqual(
            earnings.payout_wallet,
            "DevnetProviderWallet111111111111111111111111",
        )
        self.assertEqual(
            earnings.earnings_today_usd,
            Decimal("0.03"),
        )
        self.assertEqual(
            earnings.earnings_total_usd,
            Decimal("0.15"),
        )
        self.assertEqual(len(earnings.series), 2)

    def test_to_usage_records(self) -> None:
        earnings = EarningsResponse(
            worker_id="job-4a8ec471",
            payout_wallet="DevnetProviderWallet111111111111111111111111",
            earnings_today_usd=Decimal("0.03"),
            earnings_total_usd=Decimal("0.15"),
            series=[
                {
                    "bucket": "2026-10-03T19:50:00Z",
                    "cost_usd": 0.01,
                },
                {
                    "bucket": "2026-10-03T19:51:00Z",
                    "cost_usd": 0.02,
                },
            ],
        )

        records = earnings.to_usage_records()

        self.assertEqual(
            records,
            [
                UsageRecord(
                    worker_id="job-4a8ec471",
                    payout_wallet="DevnetProviderWallet111111111111111111111111",
                    bucket="2026-10-03T19:50:00Z",
                    cost_usd=Decimal("0.01"),
                ),
                UsageRecord(
                    worker_id="job-4a8ec471",
                    payout_wallet="DevnetProviderWallet111111111111111111111111",
                    bucket="2026-10-03T19:51:00Z",
                    cost_usd=Decimal("0.02"),
                ),
            ],
        )

    def test_empty_series_returns_no_usage_records(self) -> None:
        data = {
            "worker_id": "job-4a8ec471",
            "payout_wallet": "DevnetProviderWallet111111111111111111111111",
            "earnings_today_usd": 0,
            "earnings_total_usd": 0,
            "series": [],
        }

        earnings = EarningsResponse.from_dict(data)
        records = earnings.to_usage_records()

        self.assertEqual(records, [])


if __name__ == "__main__":
    unittest.main()