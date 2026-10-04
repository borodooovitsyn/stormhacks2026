"use client";

import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useAuth } from "@/components/Providers";
import { KycPanel } from "@/components/KycPanel";
import { Tooltip } from "@/components/ui/tooltip-card";
import { SAMPLE_BALANCE_USD, SAMPLE_PAYOUTS } from "@/lib/pending";
import { Button, Card, EmptyState, PageHeader, PreviewBadge, sol } from "@/components/ui";

export default function WalletPage() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const { token, signIn, signingIn, error } = useAuth();
  const [walletSol, setWalletSol] = useState<number | "error" | null>(null);
  const [copied, setCopied] = useState(false);
  const [amount, setAmount] = useState(10);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) return;
    let cancelled = false;
    connection
      .getBalance(publicKey)
      .then((l) => !cancelled && setWalletSol(l / LAMPORTS_PER_SOL))
      .catch(() => !cancelled && setWalletSol("error"));
    return () => {
      cancelled = true;
    };
  }, [publicKey, connection]);

  if (!connected || !publicKey) {
    return (
      <>
        <PageHeader title="Wallet" subtitle="Your credits, deposits and payouts, all settled on Solana." />
        <Card>
          <EmptyState
            title="No wallet, no wallet page"
            body="Sign in with Phantom. No email or card needed; you just sign a one-time message."
            action={<Button onClick={() => setVisible(true)}>Connect wallet</Button>}
          />
        </Card>
      </>
    );
  }

  const address = publicKey.toBase58();

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
          token ? (
            <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
              Signed in
            </span>
          ) : (
            <Button onClick={signIn} disabled={signingIn}>
              {signingIn ? "Check your wallet…" : "Sign in with wallet"}
            </Button>
          )
        }
      />
      {error && <p className="mb-4 text-sm text-danger" role="alert">{error}</p>}

      <Card className="mb-4">
        <p className="text-sm text-muted">Connected address</p>
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
            <Tooltip content="Solana’s test network. Tokens here have no real value, so nothing you do here costs real money.">
              devnet
            </Tooltip>
            )
          </p>
          {walletSol === null ? (
            <div className="skeleton mt-2 h-9 w-36" />
          ) : walletSol === "error" ? (
            <p className="mt-2 text-sm text-danger">Couldn’t read the balance from devnet. Reload to retry.</p>
          ) : (
            <p className="num mt-1 text-3xl font-semibold tracking-tight">{walletSol.toFixed(3)} SOL</p>
          )}
        </Card>
        <Card>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted">Credit balance</p>
            <PreviewBadge />
          </div>
          <p className="num mt-1 text-3xl font-semibold tracking-tight">{sol(SAMPLE_BALANCE_USD, 2)}</p>
          <fieldset className="mt-5">
            <legend className="mb-2 text-sm text-muted">Add credits</legend>
            <div className="flex flex-wrap items-center gap-2">
              {[5, 10, 25, 50].map((v) => (
                <label key={v} className="cursor-pointer">
                  <input
                    type="radio"
                    name="amount"
                    value={v}
                    checked={amount === v}
                    onChange={() => setAmount(v)}
                    className="peer sr-only"
                  />
                  <span className="num inline-flex h-10 min-w-14 items-center justify-center rounded-lg border border-border px-3 text-sm transition-colors hover:bg-surface-2 peer-checked:border-accent peer-checked:text-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
                    {v} SOL
                  </span>
                </label>
              ))}
              <Button
                onClick={() =>
                  setNote("Deposits are waiting on the escrow endpoint (POST /wallet/deposit). Nothing was charged.")
                }
              >
                Deposit {amount} SOL
              </Button>
            </div>
          </fieldset>
          {note && <p role="status" className="mt-3 text-xs text-warn">{note}</p>}
        </Card>
      </div>

      <div className="mt-4">
        <KycPanel />
      </div>

      <Card className="mt-4">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="font-medium">Payout history</h2>
          <PreviewBadge />
        </div>
        <ul className="divide-y divide-border">
          {SAMPLE_PAYOUTS.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="font-mono text-muted">{p.signature}</span>
              <span className="text-xs text-muted">{p.ago_min} min ago</span>
              <span className="num font-medium text-accent">+{sol(p.amount_usd)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
