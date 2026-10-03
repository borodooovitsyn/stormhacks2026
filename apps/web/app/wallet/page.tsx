"use client";

import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useAuth } from "@/components/Providers";
import { KycPanel } from "@/components/KycPanel";
import { SAMPLE_BALANCE_USD, SAMPLE_PAYOUTS } from "@/lib/pending";
import { Button, Card, EmptyState, PageHeader, PreviewBadge, Stat, usd } from "@/components/ui";

export default function WalletPage() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const { token, signIn, signingIn, error } = useAuth();
  const [sol, setSol] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!publicKey) return;
    let cancelled = false;
    connection
      .getBalance(publicKey)
      .then((l) => !cancelled && setSol(l / LAMPORTS_PER_SOL))
      .catch(() => !cancelled && setSol(null));
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
            title="Connect a wallet to continue"
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
        <p className="text-xs uppercase tracking-wider text-muted">Connected address</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <code className="break-all font-mono text-sm sm:text-base">{address}</code>
          <button
            onClick={copy}
            className="rounded-lg border border-border px-3 py-1 text-xs text-muted hover:text-text"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Stat
          label="Wallet balance (devnet)"
          value={sol === null ? "" : `${sol.toFixed(3)} SOL`}
          loading={sol === null}
        />
        <Card>
          <div className="flex items-center gap-2">
            <p className="text-xs uppercase tracking-wider text-muted">Credit balance</p>
            <PreviewBadge />
          </div>
          <p className="num mt-2 text-3xl font-semibold tracking-tight">{usd(SAMPLE_BALANCE_USD, 2)}</p>
          <div className="mt-4">
            <Button
              variant="ghost"
              onClick={() => setNote("Deposits need the escrow endpoint (POST /wallet/deposit), not in the API yet.")}
            >
              Deposit credits
            </Button>
          </div>
          {note && <p className="mt-3 text-xs text-warn">{note}</p>}
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
              <span className="num font-medium text-accent">+{usd(p.amount_usd)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
