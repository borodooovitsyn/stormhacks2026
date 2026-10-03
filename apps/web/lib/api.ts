// Typed client for the GPU Share API (services/api). Only endpoints that exist
// in the agreed contract live here. Anything the UI needs that isn't in the
// contract goes through lib/pending.ts until the backend owner adds it.

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const TOKEN_KEY = "gpushare.token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable: session-only */
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} on ${path}`);
  return res.json() as Promise<T>;
}

export type EarningsPoint = { bucket: number; cost_usd: number };

export type Earnings = {
  worker_id: string;
  payout_wallet: string;
  earnings_today_usd: number;
  earnings_total_usd: number;
  series: EarningsPoint[];
};

export type PairResult = {
  code: string;
  device_token: string;
  status: "pending" | "approved";
};

export const api = {
  health: () => request<{ status: string }>("/health"),
  nonce: (wallet: string) =>
    request<{ wallet: string; nonce: string }>("/auth/nonce", {
      method: "POST",
      body: JSON.stringify({ wallet }),
    }),
  verify: (wallet: string, signature: string) =>
    request<{ token: string; wallet: string }>("/auth/verify", {
      method: "POST",
      body: JSON.stringify({ wallet, signature }),
    }),
  pair: () => request<PairResult>("/devices/pair", { method: "POST" }),
  earnings: (workerId: string) =>
    request<Earnings>(`/earnings/${encodeURIComponent(workerId)}`),
};
