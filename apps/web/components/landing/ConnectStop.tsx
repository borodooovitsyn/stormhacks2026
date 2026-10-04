"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { ConnectCta } from "@/components/ConnectCta";
import { Button } from "@/components/ui";
import { Stop } from "./Stop";

const STEPS = [
  "Phantom pops up and asks you to sign one message.",
  "We check it’s really you and let you in.",
  "That’s all. Signing in moves no money.",
];

export function ConnectStop() {
  const { connected } = useWallet();
  return (
    <Stop
      id="connect"
      title={connected ? "Wallet connected." : "Plug in. No email, no card."}
      body={
        connected
          ? "You’re in. Go throw a job at it, or see what your GPU’s been up to."
          : "Your wallet is your login. No forms, no passwords. Here’s what happens when you click."
      }
      actions={
        <>
          <ConnectCta />
          {!connected && (
            <Button href="https://phantom.app/" variant="ghost">
              Get Phantom
            </Button>
          )}
        </>
      }
      object={
        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <ol className="space-y-4">
            {STEPS.map((s, i) => (
              <li key={s} className="flex gap-4">
                <span className="num font-mono text-sm text-accent">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          <p className="mt-6 border-t border-border pt-4 text-sm text-muted">
            This runs on devnet, Solana’s test network. No real money, nothing to lose.
          </p>
        </div>
      }
    />
  );
}
