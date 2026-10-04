"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { WORKLOADS, outputName, type Chunk, type WorkloadPreset } from "@/lib/pending";
import { usePolling } from "@/lib/usePolling";
import { Button, Card, LiveBadge, PageHeader } from "@/components/ui";

function parsePreset(value: string | null): WorkloadPreset {
  if (value === "images" || value === "blender" || value === "custom") return value;
  return "transcribe";
}

function elapsedLabel(seconds: number) {
  return `${Math.floor(seconds / 60)}m${String(seconds % 60).padStart(2, "0")}s`;
}

export function JobView() {
  const routeParams = useParams<{ id: string }>();
  const params = useSearchParams();
  const preset = parsePreset(params.get("type"));
  const meta = WORKLOADS[preset];
  const fileCount = Math.max(1, Number(params.get("files")) || 1);
  const fetchJob = useCallback(() => api.job(routeParams.id), [routeParams.id]);
  const { data: job, error: jobError, loading } = usePolling(fetchJob, 2000);
  const [elapsed, setElapsed] = useState(0);

  const finished = job?.status === "complete" || job?.status === "failed";
  useEffect(() => {
    if (finished) return;
    const id = window.setInterval(() => setElapsed((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(id);
  }, [finished]);

  const chunks: Chunk[] = (job?.chunks ?? []).map((chunk, index) => ({
    id: chunk.chunk_id,
    worker: chunk.worker_id || "Waiting for provider",
    status:
      chunk.status === "complete"
        ? "done"
        : chunk.status === "claimed"
          ? "running"
          : chunk.status === "failed"
            ? "failed"
            : "queued",
    progress: chunk.status === "complete" ? 100 : chunk.status === "claimed" ? 50 : 0,
    outputName: outputName(preset, index),
    resultUrl: chunk.result_url,
    error: chunk.error,
  }));
  const done = chunks.filter((chunk) => chunk.status === "done").length;

  return (
    <>
      <PageHeader
        title={`Job #${routeParams.id.slice(0, 8)} · ${meta.label}`}
        subtitle={`${fileCount} input file${fileCount === 1 ? "" : "s"} · ${job?.image ?? "Loading…"}`}
        action={<LiveBadge live={job?.status === "queued" || job?.status === "running"} />}
      />

      {jobError && (
        <Card className="mb-4 border-danger/40">
          <p className="font-medium text-danger">Backend unavailable</p>
          <p className="mt-1 text-sm text-muted">{jobError}</p>
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
          <p className="font-medium capitalize">{loading ? "Loading" : job?.status ?? "Unavailable"}</p>
          <p className="num text-sm text-muted">
            {done}/{chunks.length} done · elapsed {elapsedLabel(elapsed)}
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {chunks.map((chunk, index) => (
            <div key={chunk.id} className="border-b border-border pb-4 last:border-0">
              <div className="grid grid-cols-[minmax(100px,1fr)_120px] items-center gap-3 text-sm">
                <span className="truncate font-medium">{chunk.worker}</span>
                <span
                  className={`text-right capitalize ${chunk.status === "failed" ? "text-danger" : "text-muted"}`}
                >
                  chunk {index + 1}: {chunk.status}
                </span>
              </div>
              {chunk.status === "running" && (
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full w-1/2 animate-pulse rounded-full bg-accent" />
                </div>
              )}
              {chunk.error && <p className="mt-2 text-sm text-danger">{chunk.error}</p>}
            </div>
          ))}
          {!loading && chunks.length === 0 && (
            <p className="text-sm text-muted">No chunks were returned by the backend.</p>
          )}
        </div>

        <div className="mt-7 border-t border-border pt-5">
          <h2 className="font-medium">Results</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {chunks
              .filter((chunk) => chunk.resultUrl)
              .map((chunk) => (
                <a
                  key={chunk.id}
                  href={api.resultUrl(chunk.resultUrl!)}
                  className="inline-flex h-9 items-center rounded-lg border border-accent/50 px-3 text-sm text-text transition-colors hover:bg-accent/10"
                >
                  ↓ Download result.zip
                </a>
              ))}
            {done === 0 && (
              <p className="text-sm text-muted">
                The download appears after the GPU worker uploads its output.
              </p>
            )}
          </div>
        </div>
      </Card>

      <div className="mt-4 flex gap-3">
        <Button href="/rent" variant="ghost">Run another job</Button>
      </div>
    </>
  );
}
