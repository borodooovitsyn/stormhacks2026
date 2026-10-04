"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { WORKLOADS, estimateJob, type WorkloadPreset } from "@/lib/pending";
import { Button, Card, PageHeader, PreviewBadge, usd } from "@/components/ui";
import { Tooltip } from "@/components/ui/tooltip-card";

const PRESETS: WorkloadPreset[] = ["transcribe", "images", "blender", "custom"];

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function RentPage() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [preset, setPreset] = useState<WorkloadPreset>("transcribe");
  const [image, setImage] = useState(WORKLOADS.transcribe.image);
  const [files, setFiles] = useState<File[]>([]);
  const [drag, setDrag] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = WORKLOADS[preset];
  const units = Math.max(files.length, preset === "blender" && files.length ? 50 : files.length);
  const estimateUnits = files.length ? units : 0;
  const est = estimateJob(preset, estimateUnits);
  const totalSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);
  const canRun = files.length > 0 && image.trim().length > 0;

  const addFiles = (list: FileList | null) => {
    if (list) setFiles((f) => [...f, ...Array.from(list)]);
  };

  const selectPreset = (next: WorkloadPreset) => {
    setPreset(next);
    if (next !== "custom") setImage(WORKLOADS[next].image);
  };

  const run = async () => {
    setRunning(true);
    setError(null);
    const params = new URLSearchParams({
      type: preset,
      units: String(estimateUnits),
      chunks: String(est.chunks),
      image: image.trim(),
      files: String(files.length),
    });
    try {
      const created = await api.createJob({
        job_type: preset,
        image: image.trim(),
        input_url: `mock://web-upload/${files.map((file) => encodeURIComponent(file.name)).join(",")}`,
        total_units: estimateUnits,
        requested_chunks: Math.max(1, est.chunks),
      });
      router.push(`/jobs/${created.job_id}?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the job");
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <PageHeader
        title="New job"
        subtitle="Bring a container image and input files. Every workload reads /input and writes /output."
        action={<PreviewBadge>Needs image field in API</PreviewBadge>}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card>
          <div className="space-y-6">
            <section>
              <h2 className="text-sm font-medium text-muted">Workload</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {PRESETS.map((key) => {
                  const active = preset === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => selectPreset(key)}
                      className={`h-9 rounded-lg border px-3 text-sm font-medium transition-colors ${
                        active
                          ? "border-accent bg-accent text-accent-ink"
                          : "border-border text-text hover:bg-surface-2"
                      }`}
                    >
                      {active ? "▸ " : ""}
                      {WORKLOADS[key].label}
                    </button>
                  );
                })}
              </div>
            </section>

            <label className="block">
              <span className="flex items-center gap-2 text-sm font-medium text-muted">
                Image
                <Tooltip content="Preset chips fill this field. Custom accepts any Docker image that follows the /input to /output contract.">
                  Docker image
                </Tooltip>
              </span>
              <input
                value={image}
                onChange={(event) => {
                  setImage(event.target.value);
                  if (preset !== "custom" && event.target.value !== WORKLOADS[preset].image) setPreset("custom");
                }}
                spellCheck={false}
                placeholder="ghcr.io/team/my-gpu-job:latest"
                className="mt-2 h-11 w-full rounded-lg border border-border bg-bg px-3 font-mono text-sm text-text outline-none transition-colors placeholder:text-muted focus:border-accent"
              />
              <p className="mt-2 text-xs text-muted">{meta.blurb}</p>
            </label>

            <section>
              <h2 className="mb-3 text-sm font-medium text-muted">Input files</h2>
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDrag(false);
                  addFiles(event.dataTransfer.files);
                }}
                onClick={() => input.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") input.current?.click();
                }}
                tabIndex={0}
                role="button"
                aria-label="Upload input files"
                className={`grid min-h-[180px] cursor-pointer place-items-center rounded-lg border border-dashed px-6 py-10 text-center transition-colors ${
                  drag ? "border-accent bg-accent/5" : "border-border hover:bg-surface-2"
                }`}
              >
                <div>
                  <p className="text-3xl" aria-hidden>
                    ↓
                  </p>
                  <p className="mt-3 font-medium">Drag input files here</p>
                  <p className="mt-1 text-xs text-muted">
                    They become `/input` for the container. Results come back from `/output`.
                  </p>
                  <input
                    ref={input}
                    type="file"
                    multiple
                    accept={meta.accepts}
                    className="hidden"
                    onChange={(event) => addFiles(event.target.files)}
                  />
                </div>
              </div>

              {files.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <p className="font-medium">
                      {files.length} file{files.length === 1 ? "" : "s"} queued
                    </p>
                    <button
                      type="button"
                      onClick={() => setFiles([])}
                      className="text-sm text-muted transition-colors hover:text-danger"
                    >
                      Clear
                    </button>
                  </div>
                  <ul className="mt-2 max-h-44 divide-y divide-border overflow-auto text-sm">
                    {files.map((file, index) => (
                      <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 py-2">
                        <span className="truncate">{file.name}</span>
                        <span className="num shrink-0 text-muted">{formatBytes(file.size)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>
        </Card>

        <Card className="h-fit lg:sticky lg:top-24">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="font-medium">Queue</h2>
            <PreviewBadge>Estimate</PreviewBadge>
          </div>
          <dl className="space-y-3 text-sm">
            <Row k="Input" v={files.length ? `${files.length} files · ${formatBytes(totalSize)}` : "—"} />
            <Row k="Splits into" v={est.chunks ? `${est.chunks} chunks` : "—"} />
            <Row k="Workers" v={est.workers ? `${est.workers} GPUs` : "—"} />
            <Row k="Runtime" v={est.eta_min ? `~${est.eta_min} min` : "—"} />
            <div className="border-t border-border pt-3">
              <Row k="Estimated cost" v={est.cost_usd ? usd(est.cost_usd, 2) : "—"} strong />
            </div>
          </dl>
          <div className="mt-5 [&>*]:w-full">
            <Button onClick={run} disabled={!canRun || running}>
              {running ? "Queueing..." : "Run job"}
            </Button>
          </div>
          {error && (
            <p className="mt-3 text-sm text-danger" role="alert">
              {error}. Start the backend with <code className="font-mono text-text">make api</code>.
            </p>
          )}
          <p className="mt-3 text-xs text-muted" aria-live="polite">
            {!files.length
              ? "Add at least one input file to estimate the queue."
              : !image.trim()
                ? "Add a container image before running."
                : `Est: ~${usd(est.cost_usd, 2)} · ~${est.eta_min} min across ${est.workers} GPUs`}
          </p>
        </Card>
      </div>
    </>
  );
}

function Row({ k, v, strong }: { k: React.ReactNode; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{k}</dt>
      <dd className={`num text-right ${strong ? "text-lg font-semibold" : ""}`}>{v}</dd>
    </div>
  );
}
