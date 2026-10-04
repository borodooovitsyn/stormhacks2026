"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { ConnectCta } from "@/components/ConnectCta";

const LOG = [
  { k: "wallet", v: "asks you to sign one message" },
  { k: "coreshare", v: "checks it is really you, lets you in" },
  { k: "money", v: "none moves. signing in is free" },
];

// Closing band: full width and stacked, so the page doesn't end on a third left/right split.
export function ConnectStop() {
  const { connected } = useWallet();
  return (
    <section id="connect" className="scroll-mt-28 border-t border-border py-16 sm:py-24">
      <div className="rounded-2xl border border-border bg-surface px-6 py-10 sm:px-12 sm:py-14">
        <h2 className="max-w-2xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          {connected ? "Wallet connected." : "Plug in. No email, no card."}
        </h2>
        <p className="mt-4 max-w-lg text-muted">
          {connected
            ? "You’re in. Throw a job at it, or see what your GPU has been up to."
            : "Your wallet is your login. No forms, no passwords."}
        </p>
        <ul className="mt-8 max-w-xl divide-y divide-border font-mono text-sm" aria-label="What happens when you connect">
          {LOG.map((l) => (
            <li key={l.k} className="flex gap-4 py-2.5">
              <span className="w-24 shrink-0 text-accent">{l.k}</span>
              <span className="text-muted">{l.v}</span>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <ConnectCta />
        </div>
        <p className="mt-5 text-sm text-muted">Runs on devnet, Solana’s test network. No real money.</p>
      </div>
    </section>
  );
}
