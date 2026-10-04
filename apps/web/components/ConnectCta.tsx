"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Button } from "./ui";

export function ConnectCta() {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  return connected ? (
    <Button href="/wallet">Open my wallet</Button>
  ) : (
    <Button onClick={() => setVisible(true)}>Connect wallet</Button>
  );
}
