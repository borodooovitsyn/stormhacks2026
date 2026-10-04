// Sign in by pasting a wallet address + secret key (no browser extension).
// Demo-only: real users would use Phantom. Secret key is used in-memory to sign
// the login nonce, then discarded — not stored.

import { ed25519 } from "@noble/curves/ed25519.js";
import bs58 from "bs58";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
} from "@solana/web3.js";
import { api, setSession } from "@/lib/api";

// Platform escrow (Treasury) that holds renter deposits.
export const TREASURY = "3JemD7s4eaAUADVGctMbedAFTdFxrdkdAKwMBUzZngjo";

function parseSecretKey(raw: string): Uint8Array {
  const trimmed = raw.trim();
  // Accept a JSON array ([1,2,...]) or a bs58 string.
  if (trimmed.startsWith("[")) {
    const arr = JSON.parse(trimmed) as number[];
    return Uint8Array.from(arr);
  }
  return bs58.decode(trimmed);
}

export async function signInWithSecretKey(
  address: string,
  secretKeyRaw: string,
  email?: string | null,
): Promise<void> {
  const secret = parseSecretKey(secretKeyRaw);
  if (secret.length !== 64 && secret.length !== 32) {
    throw new Error("Secret key must be 64 bytes (Solana keypair) or 32-byte seed");
  }
  const seed = secret.slice(0, 32);
  const derived = bs58.encode(ed25519.getPublicKey(seed));
  if (derived !== address.trim()) {
    throw new Error("Secret key does not match the wallet address");
  }

  const { nonce } = await api.nonce(address.trim());
  const sig = ed25519.sign(new TextEncoder().encode(nonce), seed);
  const res = await api.verify(address.trim(), bs58.encode(sig));
  setSession({ token: res.token, wallet: address.trim() });

  if (email) {
    try {
      await api.linkAccount(email, address.trim());
    } catch {
      /* non-fatal */
    }
  }
}

// Real devnet deposit: transfer SOL from the renter's wallet to the Treasury,
// then credit the backend ledger. Returns the new credit balance.
export async function depositToEscrow(
  address: string,
  secretKeyRaw: string,
  amountSol: number,
): Promise<number> {
  const secret = parseSecretKey(secretKeyRaw);
  const kp = secret.length === 64 ? Keypair.fromSecretKey(secret) : Keypair.fromSeed(secret.slice(0, 32));
  if (kp.publicKey.toBase58() !== address.trim()) {
    throw new Error("Secret key does not match the wallet address");
  }
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: kp.publicKey,
      toPubkey: new PublicKey(TREASURY),
      lamports: Math.round(amountSol * LAMPORTS_PER_SOL),
    }),
  );
  const signature = await connection.sendTransaction(tx, [kp]);
  await connection.confirmTransaction(signature, "confirmed");
  const res = await api.deposit(address.trim(), amountSol, signature);
  return res.credit_sol;
}
