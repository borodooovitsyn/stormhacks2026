"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { JOB_TYPES, estimateJob, type JobType } from "@/lib/pending";
import { Button, Card, PageHeader, PreviewBadge, usd } from "@/components/ui";
import { Tooltip } from "@/components/ui/tooltip-card";

export default function RentPage() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<JobType>("segmentation");
  const [files, setFiles] = useState<File[]>([]);
  const [drag, setDrag] = useState(false);

  const meta = JOB_TYPES[type];
  const units = files.length;
  const est = estimateJob(type, units);
  const accept = type === "segmentation" ? ".tif,.tiff,.png,.jpg,.jpeg" : "audio/*";

  const addFiles = (list: FileList | null) => {
    if (list) setFiles((f) => [...f, ...Array.from(list)]);
  };

  const run = () => router.push(`/jobs/demo?type=${type}&units=${units}`);

  return (
    <>
      <PageHeader
        title="Rent a GPU"
        subtitle="Drop in your files, pick a job, and we split the work across idle GPUs. You pay per minute of measured usage."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 font-medium">1. Job type</h2>
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Job type">
              {(Object.keys(JOB_TYPES) as JobType[]).map((k) => (
                <button
                  key={k}
                  role="radio"
                  aria-checked={type === k}
                  onClick={() => {
                    setType(k);
                    setFiles([]);
                  }}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    type === k ? "border-accent bg-accent/5" : "border-border hover:bg-surface-2"
                  }`}
                >
                  <p className="font-medium">{JOB_TYPES[k].label}</p>
                  <p className="mt-1 text-xs text-muted">{JOB_TYPES[k].blurb}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 font-medium">2. Upload {meta.unit}s</h2>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                addFiles(e.dataTransfer.files);
              }}
              onClick={() => input.current?.click()}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
              tabIndex={0}
              role="button"
              aria-label={`Upload ${meta.unit}s`}
              className={`flex cursor-pointer flex-col items-center rounded-xl border border-dashed px-6 py-10 text-center transition-colors ${
                drag ? "border-accent bg-accent/5" : "border-border hover:bg-surface-2"
              }`}
            >
              <p className="font-medium">Drop {meta.unit}s here, or click to browse</p>
              <p className="mt-1 text-xs text-muted">Files stay in your browser until you run the job.</p>
              <input
                ref={input}
                type="file"
                multiple
                accept={accept}
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
            </div>
            {files.length > 0 && (
              <ul className="mt-4 max-h-44 divide-y divide-border overflow-auto text-sm">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 py-2">
                    <span className="truncate">{f.name}</span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="num text-muted">{(f.size / 1024).toFixed(0)} KB</span>
                      <button
                        onClick={() => setFiles((all) => all.filter((_, j) => j !== i))}
                        aria-label={`Remove ${f.name}`}
                        className="rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-surface-2 hover:text-danger"
                      >
                        Remove
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card className="h-fit lg:sticky lg:top-24">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="font-medium">Estimate</h2>
            <PreviewBadge />
          </div>
          <dl className="space-y-3 text-sm">
            <Row k={`${meta.unit}s`} v={String(units)} />
            <Row
              k={
                <Tooltip content="Your job is cut into pieces, each run on a different provider’s GPU, then merged back together.">
                  Chunks
                </Tooltip>
              }
              v={units ? String(est.chunks) : "—"}
            />
            <Row k="Est. time" v={units ? `~${est.eta_min} min` : "—"} />
            <div className="border-t border-border pt-3">
              <Row k="Estimated cost" v={units ? usd(est.cost_usd) : "—"} strong />
            </div>
          </dl>
          <div className="mt-5 [&>*]:w-full">
            <Button onClick={run} disabled={units === 0}>
              {units ? `Run job · ${usd(est.cost_usd)}` : "Run job"}
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted" aria-live="polite">
            {units === 0
              ? `Add at least one ${meta.unit} to see the cost and run the job.`
              : "Charged from your credit balance. Final cost follows measured GPU usage, not this estimate."}
          </p>
        </Card>
      </div>
    </>
  );
}

function Row({ k, v, strong }: { k: React.ReactNode; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{k}</dt>
      <dd className={`num ${strong ? "text-lg font-semibold" : ""}`}>{v}</dd>
    </div>
  );
}
