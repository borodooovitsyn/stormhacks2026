"use client";

import { useCallback, useEffect, useState } from "react";
import { api, desktopDownloadUrl, getSession } from "@/lib/api";
import { usePolling } from "@/lib/usePolling";
import { EarningsChart } from "@/components/EarningsChart";
import { Card, EmptyState, LiveBadge, PageHeader, Stat, sol, shortAddr } from "@/components/ui";

export default function ProviderPage() {
  const [nowSeconds, setNowSeconds] = useState<number | null>(null);
  const wallet = getSession()?.wallet ?? null;

  useEffect(() => {
    const update = () => setNowSeconds(Math.floor(Date.now() / 1000));
    const initial = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 60_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, []);

  // Poll the wallet's AGGREGATE earnings (sum across all its workers) so the web
  // always matches whatever device/worker the provider is running.
  const fetchEarnings = useCallback(
    () => (wallet ? api.walletEarnings(wallet) : api.earnings("demo-worker")),
    [wallet],
  );
  const { data, error, loading } = usePolling(fetchEarnings, 3000);

  const perMin = data?.series.at(-1)?.cost_usd ?? 0;

  // Real devnet payouts for this provider's wallet.
  const [payouts, setPayouts] = useState<{ signature: string; amount_sol: number; ts: number }[]>([]);
  useEffect(() => {
    if (!wallet) return;
    api.payouts(wallet).then((r) => setPayouts(r.payouts)).catch(() => {});
  }, [wallet]);

  return (
    <>
      <PageHeader
        title="Provider dashboard"
        subtitle="Earnings from your shared GPU, aggregated per minute and paid out in SOL."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={desktopDownloadUrl}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold text-text transition-colors hover:bg-surface-2"
            >
              Download desktop app
            </a>
          </div>
        }
      />

      {error && !data && (
        <Card className="mb-6 border-danger/40">
          <p className="font-medium text-danger">Can’t reach the API</p>
          <p className="mt-1 text-sm text-muted">
            {error}. Start the backend with <code className="font-mono text-text">make api</code>.
          </p>
        </Card>
      )}

      <Card>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-sm text-muted">Earned today</p>
            {loading ? (
              <div className="skeleton mt-2 h-12 w-48" />
            ) : (
              <p className="num mt-1 text-5xl font-semibold tracking-tight text-accent">
                {data ? sol(data.earnings_today_usd) : "—"}
              </p>
            )}
          </div>
          <div className="flex gap-8">
            <Stat label="All time" value={data ? sol(data.earnings_total_usd) : ""} loading={loading} />
            <Stat label="Last minute" value={data ? sol(perMin) : ""} loading={loading} />
          </div>
          <LiveBadge live={!error} />
        </div>
        {loading ? (
          <div className="skeleton h-72 w-full" />
        ) : data && data.series.length > 0 ? (
          <EarningsChart series={data.series} />
        ) : (
          <EmptyState
            title="Nothing earned yet"
            body="Your GPU is napping. Start sharing from the desktop app and the first minute of earnings lands here."
          />
        )}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-medium">Payout wallet</h2>
          {loading ? (
            <div className="skeleton h-6 w-48" />
          ) : (
            <p className="break-all font-mono text-sm" title={data?.payout_wallet}>
              {data ? shortAddr(data.payout_wallet) : "—"}
            </p>
          )}
          <p className="mt-2 text-xs text-muted">
            Linked automatically when you pair the desktop app.
          </p>
        </Card>

        <Card>
          <h2 className="mb-3 font-medium">Recent payouts</h2>
          {payouts.length === 0 ? (
            <p className="text-sm text-muted">No payouts yet. Settlement pays this wallet every minute.</p>
          ) : (
            <ul className="divide-y divide-border">
              {payouts.map((p) => (
                <li key={p.signature} className="flex items-center justify-between py-2.5 text-sm">
                  <a
                    href={`https://explorer.solana.com/tx/${p.signature}?cluster=devnet`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-muted hover:text-accent"
                  >
                    {shortAddr(p.signature)}
                  </a>
                  <span className="text-xs text-muted">
                    {nowSeconds === null ? "—" : `${Math.max(0, Math.round((nowSeconds - p.ts) / 60))} min ago`}
                  </span>
                  <span className="num font-medium text-accent">+{sol(p.amount_sol)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
