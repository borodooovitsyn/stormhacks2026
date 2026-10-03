// UI-only stand-ins for endpoints the web client needs but the API contract
// does not have yet. NOT a contract: the shapes below are what the UI wants,
// to be proposed to the backend owner. Pages that use these show a
// "Preview data" badge so nobody mistakes them for real numbers.
//
// Missing endpoints (ask backend owner):
//   GET  /wallet/{address}            -> { balance_usd, deposits[], payouts[] }
//   POST /wallet/deposit              -> escrow deposit instructions
//   POST /jobs/estimate               -> { cost_usd, eta_min, chunks }
//   POST /jobs                        -> { job_id }
//   GET  /jobs/{id}                   -> job status, chunks per worker, cost, result_url

export type Payout = {
  id: string;
  ago_min: number;
  amount_usd: number;
  signature: string;
  status: "confirmed" | "pending";
};

export type JobType = "segmentation" | "whisper";

export type Chunk = {
  id: string;
  worker: string;
  status: "queued" | "running" | "done";
  progress: number;
};

export const JOB_TYPES: Record<JobType, { label: string; unit: string; ratePerUnit: number; blurb: string }> = {
  segmentation: {
    label: "Flood segmentation",
    unit: "tile",
    ratePerUnit: 0.012,
    blurb: "Sentinel-2 tiles split across provider GPUs; water pixels merged into a flood map.",
  },
  whisper: {
    label: "Whisper transcription",
    unit: "audio file",
    ratePerUnit: 0.02,
    blurb: "Audio files transcribed in parallel, one chunk per file.",
  },
};

export function estimateJob(type: JobType, units: number) {
  const { ratePerUnit } = JOB_TYPES[type];
  const cost = units * ratePerUnit;
  return {
    cost_usd: Math.round(cost * 10000) / 10000,
    chunks: Math.max(1, Math.ceil(units / 4)),
    eta_min: Math.max(1, Math.ceil(units / 6)),
  };
}

// Fixed offsets (not Date.now) so server and client render the same markup.
export const SAMPLE_PAYOUTS: Payout[] = [
  { id: "p4", ago_min: 4, amount_usd: 0.1840, signature: "5Kd9…q2Tn", status: "confirmed" },
  { id: "p3", ago_min: 19, amount_usd: 0.2210, signature: "3Hf1…x8Zc", status: "confirmed" },
  { id: "p2", ago_min: 41, amount_usd: 0.0960, signature: "9Pa7…m1Wd", status: "confirmed" },
  { id: "p1", ago_min: 95, amount_usd: 0.3120, signature: "2Rt5…k6Vb", status: "confirmed" },
];

export const SAMPLE_BALANCE_USD = 12.5;
