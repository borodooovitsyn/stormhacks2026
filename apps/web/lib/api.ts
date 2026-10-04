// Typed client for the GPU Share API (services/api). Only endpoints that exist
// in the agreed contract live here. Anything the UI needs that isn't in the
// contract goes through lib/pending.ts until the backend owner adds it.

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const TOKEN_KEY = "gpushare.token";
const WALLET_KEY = "gpushare.wallet";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

// A token only means something for the wallet that signed for it, so the two
// are stored and cleared together.
export type Session = { token: string; wallet: string };

export function getSession(): Session | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const wallet = localStorage.getItem(WALLET_KEY);
    return token && wallet ? { token, wallet } : null;
  } catch {
    return null;
  }
}

export function setSession(session: Session | null) {
  try {
    if (session) {
      localStorage.setItem(TOKEN_KEY, session.token);
      localStorage.setItem(WALLET_KEY, session.wallet);
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(WALLET_KEY);
    }
  } catch {
    /* storage unavailable: session-only */
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
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

export type JobCreateInput = {
  job_type: string;
  image: string;
  input_url: string;
  total_units: number;
  requested_chunks: number;
};

export type JobCreateResult = {
  job_id: string;
  job_type: string;
  image: string;
  status: "queued";
  chunk_count: number;
};

export type JobChunkStatus = {
  chunk_id: string;
  job_id: string;
  job_type: string;
  image: string;
  input_url: string;
  worker_id: string | null;
  status: "pending" | "claimed" | "complete";
  start_unit: number;
  end_unit: number;
  result_url: string | null;
};

export type JobStatus = {
  job_id: string;
  job_type: string;
  image: string;
  input_url: string;
  status: "queued" | "running" | "complete";
  total_units: number;
  chunk_count: number;
  chunks_complete: number;
  chunks: JobChunkStatus[];
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
  approvePair: (code: string, wallet: string) =>
    request<PairResult>(`/devices/pair/${encodeURIComponent(code)}/approve`, {
      method: "POST",
      body: JSON.stringify({ wallet }),
    }),
  earnings: (workerId: string) =>
    request<Earnings>(`/earnings/${encodeURIComponent(workerId)}`),
  walletWorkers: (wallet: string) =>
    request<{ wallet: string; worker_ids: string[] }>(
      `/wallets/${encodeURIComponent(wallet)}/workers`,
    ),
  walletEarnings: (wallet: string) =>
    request<Earnings>(`/wallets/${encodeURIComponent(wallet)}/earnings`),
  credits: (wallet: string) =>
    request<{ wallet: string; credit_sol: number }>(`/wallets/${encodeURIComponent(wallet)}/credits`),
  deposit: (wallet: string, amount_sol: number, signature: string) =>
    request<{ wallet: string; credit_sol: number }>(`/wallets/${encodeURIComponent(wallet)}/deposit`, {
      method: "POST",
      body: JSON.stringify({ amount_sol, signature }),
    }),
  payouts: (wallet: string) =>
    request<{ wallet: string; payouts: { signature: string; amount_sol: number; ts: number }[] }>(
      `/payouts/${encodeURIComponent(wallet)}`,
    ),
  linkAccount: (email: string, wallet: string) =>
    request<{ email: string; wallet: string }>("/accounts", {
      method: "POST",
      body: JSON.stringify({ email, wallet }),
    }),
  createJob: (job: JobCreateInput) =>
    request<JobCreateResult>("/jobs", {
      method: "POST",
      body: JSON.stringify(job),
    }),
  job: (jobId: string) =>
    request<JobStatus>(`/jobs/${encodeURIComponent(jobId)}`),
};

export const desktopDownloadUrl = `${API_URL}/downloads/desktop`;
