// UI-only stand-ins for endpoints the web client needs but the API contract
// does not have yet. NOT a contract: the shapes below are what the UI wants,
// to be proposed to the backend owner. Pages that use these show a
// "Preview data" badge so nobody mistakes them for real numbers.
//
// Missing endpoints / fields (ask backend owner):
//   POST /jobs                        -> { job_id }, body includes { image, input_url, job_type }
//   GET  /jobs/{id}                   -> job status, chunks per worker, cost, result_urls
//   POST /jobs/upload                 -> input bundle URL for /input
//   POST /wallet/deposit              -> escrow deposit instructions
//
// Worker contract:
//   container reads /input and writes /output; worker runs it sandboxed.

export type Payout = {
  id: string;
  ago_min: number;
  amount_usd: number;
  signature: string;
  status: "confirmed" | "pending";
};

export type WorkloadPreset = "transcribe" | "images" | "blender" | "custom";

export type WorkloadMeta = {
  label: string;
  image: string;
  unit: string;
  chunkSize: number;
  ratePerUnit: number;
  blurb: string;
  accepts?: string;
};

export type Chunk = {
  id: string;
  worker: string;
  status: "queued" | "running" | "done";
  progress: number;
  outputName: string;
};

export const WORKLOADS: Record<WorkloadPreset, WorkloadMeta> = {
  transcribe: {
    label: "Transcribe",
    image: "gpu-share/whisper:cpu",
    unit: "audio file",
    chunkSize: 1,
    ratePerUnit: 0.02,
    accepts: "audio/*",
    blurb: "Audio chunks become transcripts in /output.",
  },
  images: {
    label: "Images",
    image: "gpu-share/segment-anything:cuda",
    unit: "image",
    chunkSize: 4,
    ratePerUnit: 0.012,
    accepts: "image/*,.tif,.tiff",
    blurb: "Image batches run as independent chunks.",
  },
  blender: {
    label: "Blender",
    image: "gpu-share/blender:cuda",
    unit: "frame",
    chunkSize: 10,
    ratePerUnit: 0.004,
    accepts: ".blend,.zip,.png,.jpg,.jpeg,.exr,.hdr",
    blurb: "A scene renders in frame ranges across workers.",
  },
  custom: {
    label: "Custom",
    image: "",
    unit: "input",
    chunkSize: 2,
    ratePerUnit: 0.018,
    blurb: "Any Docker image that reads /input and writes /output.",
  },
};

export function estimateJob(preset: WorkloadPreset, units: number) {
  const meta = WORKLOADS[preset];
  const normalizedUnits = Math.max(0, units);
  const chunks = normalizedUnits ? Math.max(1, Math.ceil(normalizedUnits / meta.chunkSize)) : 0;
  const cost = normalizedUnits * meta.ratePerUnit + (chunks ? 0.06 : 0);

  return {
    cost_usd: Math.round(cost * 10000) / 10000,
    chunks,
    eta_min: normalizedUnits ? Math.max(1, Math.ceil(chunks / 3 + normalizedUnits / 30)) : 0,
    workers: normalizedUnits ? Math.min(3, chunks || 1) : 0,
  };
}

export function outputName(preset: WorkloadPreset, index: number) {
  const n = String(index + 1).padStart(2, "0");
  if (preset === "transcribe") return `ep${n}.txt`;
  if (preset === "blender") return `frames-${n}.zip`;
  if (preset === "images") return `batch-${n}-results.zip`;
  return `output-${n}.zip`;
}

// Fixed offsets (not Date.now) so server and client render the same markup.
export const SAMPLE_PAYOUTS: Payout[] = [
  { id: "p4", ago_min: 4, amount_usd: 0.1840, signature: "5Kd9...q2Tn", status: "confirmed" },
  { id: "p3", ago_min: 19, amount_usd: 0.2210, signature: "3Hf1...x8Zc", status: "confirmed" },
  { id: "p2", ago_min: 41, amount_usd: 0.0960, signature: "9Pa7...m1Wd", status: "confirmed" },
  { id: "p1", ago_min: 95, amount_usd: 0.3120, signature: "2Rt5...k6Vb", status: "confirmed" },
];

export const SAMPLE_BALANCE_USD = 12.5;
