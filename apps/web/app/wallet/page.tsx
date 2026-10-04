"use client";

import { useCallback, useEffect, useState } from "react";
import { Connection, LAMPORTS_PER_SOL, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { api, getSession } from "@/lib/api";
import { depositToEscrow } from "@/lib/walletKey";
import { LinkWalletForm } from "@/components/LinkWalletForm";
import { Tooltip } from "@/components/ui/tooltip-card";
import { Card, PageHeader, shortAddr, sol } from "@/components/ui";

export default function WalletPage() {
  const [address, setAddress] = useState<string | null>(null);
  const [walletSol, setWalletSol] = useState<number | "error" | null>(null);
  const [payouts, setPayouts] = useState<{ signature: string; amount_sol: number; ts: number }[]>([]);
  const [credit, setCredit] = useState(0);
  const [depAmount, setDepAmount] = useState("1");
  const [depKey, setDepKey] = useState("");
  const [depositing, setDepositing] = useState(false);
  const [depMsg, setDepMsg] = useState("");
  const [copied, setCopied] = useState(false);

  async function deposit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    setDepositing(true);
    setDepMsg("");
    try {
      const bal = await depositToEscrow(address, depKey, Number(depAmount));
      setCredit(bal);
      setDepKey("");
      setDepMsg("✓ Deposited — credits updated.");
    } catch (err) {
      setDepMsg(err instanceof Error ? err.message : "Deposit failed");
    } finally {
      setDepositing(false);
    }
  }
  const [nowSeconds, setNowSeconds] = useState<number | null>(null);

  // Re-read the linked wallet (set by the form) so the page updates after linking.
  const refresh = useCallback(() => setAddress(getSession()?.wallet ?? null), []);
  useEffect(() => {
    const initial = window.setTimeout(refresh, 0);
    const id = setInterval(refresh, 1500);
    return () => {
      window.clearTimeout(initial);
      clearInterval(id);
    };
  }, [refresh]);

  useEffect(() => {
    const update = () => setNowSeconds(Math.floor(Date.now() / 1000));
    const initial = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 60_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!address) return;
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    let cancelled = false;
    connection
      .getBalance(new PublicKey(address))
      .then((l) => !cancelled && setWalletSol(l / LAMPORTS_PER_SOL))
      .catch(() => !cancelled && setWalletSol("error"));
    api
      .payouts(address)
      .then((r) => !cancelled && setPayouts(r.payouts))
      .catch(() => {});
    api
      .credits(address)
      .then((r) => !cancelled && setCredit(r.credit_sol))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [address]);

  if (!address) {
    return (
      <>
        <PageHeader title="Wallet" subtitle="Link your payout wallet to this account." />
        <Card className="max-w-lg">
          <h2 className="mb-3 font-medium">Link a payout wallet</h2>
          <LinkWalletForm />
        </Card>
      </>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <>
      <PageHeader
        title="Wallet"
        subtitle="Your credits, deposits and payouts, all settled on Solana devnet."
        action={
          <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">Linked</span>
        }
      />

      <Card className="mb-4">
        <p className="text-sm text-muted">Payout address</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <code className="break-all font-mono text-sm sm:text-base">{address}</code>
          <button
            onClick={copy}
            aria-live="polite"
            className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-muted">
            Wallet balance (
            <Tooltip content="Solana’s test network. Tokens here have no real value.">devnet</Tooltip>)
          </p>
          {walletSol === null ? (
            <div className="skeleton mt-2 h-9 w-36" />
          ) : walletSol === "error" ? (
            <p className="mt-2 text-sm text-danger">Couldn’t read the balance from devnet.</p>
          ) : (
            <p className="num mt-1 text-3xl font-semibold tracking-tight">{walletSol.toFixed(3)} SOL</p>
          )}
        </Card>
        <Card>
          <p className="text-sm text-muted">Credit balance (escrow)</p>
          <p className="num mt-1 text-3xl font-semibold tracking-tight">{credit.toFixed(3)} SOL</p>
          <form onSubmit={deposit} className="mt-4 flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={depAmount}
                onChange={(e) => setDepAmount(e.target.value)}
                placeholder="Amount SOL"
                className="h-9 w-28 rounded-lg border border-border bg-bg px-2 text-sm outline-none focus:border-accent"
              />
              <button
                type="submit"
                disabled={depositing}
                className="h-9 rounded-lg bg-accent px-3 text-sm font-semibold text-accent-ink hover:bg-accent-hover disabled:opacity-50"
              >
                {depositing ? "Depositing…" : "Deposit"}
              </button>
            </div>
            <input
              value={depKey}
              onChange={(e) => setDepKey(e.target.value)}
              placeholder="Secret key (to sign the transfer)"
              className="h-9 w-full rounded-lg border border-border bg-bg px-2 font-mono text-xs outline-none focus:border-accent"
            />
            {depMsg && <p className={`text-xs ${depMsg.startsWith("✓") ? "text-accent" : "text-danger"}`}>{depMsg}</p>}
          </form>
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="mb-3 font-medium">Payout history</h2>
        {payouts.length === 0 ? (
          <p className="text-sm text-muted">No payouts yet. Earnings settle to this wallet every minute.</p>
        ) : (
          <ul className="divide-y divide-border">
            {payouts.map((p) => (
              <li key={p.signature} className="flex items-center justify-between gap-3 py-3 text-sm">
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
    </>
  );
}
