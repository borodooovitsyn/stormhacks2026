"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  WORKLOADS,
  estimateJob,
  outputName,
  type Chunk,
  type WorkloadPreset,
} from "@/lib/pending";
import { Button, Card, LiveBadge, PageHeader, PreviewBadge, usd } from "@/components/ui";

const WORKERS = ["laptop-2", "laptop-3", "studio-4090"];

function parsePreset(value: string | null): WorkloadPreset {
  if (value === "images" || value === "blender" || value === "custom") return value;
  return "transcribe";
}

function elapsedLabel(seconds: number) {
  return `${Math.floor(seconds / 60)}m${String(Math.floor(seconds % 60)).padStart(2, "0")}s`;
}

// Local simulation until GET /jobs/{id} exists. Tick = 700 ms.
export function JobView() {
  const routeParams = useParams<{ id: string }>();
  const params = useSearchParams();
  const preset = parsePreset(params.get("type"));
  const meta = WORKLOADS[preset];
  const units = Math.max(1, Number(params.get("units")) || (preset === "blender" ? 50 : 12));
  const image = params.get("image") || meta.image || "custom/image:latest";
  const fileCount = Math.max(1, Number(params.get("files")) || 1);
  const est = useMemo(() => estimateJob(preset, units), [preset, units]);
  const chunkCount = Math.max(1, Number(params.get("chunks")) || est.chunks || 1);

  const [chunks, setChunks] = useState<Chunk[]>(() =>
    Array.from({ length: chunkCount }, (_, index) => ({
      id: `chunk-${index + 1}`,
      worker: WORKERS[index % WORKERS.length],
      status: "queued",
      progress: 0,
      outputName: outputName(preset, index),
    })),
  );
  const [elapsed, setElapsed] = useState(0);
  const tickRef = useRef(0);

  const allDone = chunks.every((chunk) => chunk.status === "done");

  useEffect(() => {
    if (allDone) return;
    const id = setInterval(() => {
      tickRef.current += 1;
      setElapsed((seconds) => seconds + 0.7);
      setChunks((previous) => {
        const busy = new Set(previous.filter((chunk) => chunk.status === "running").map((chunk) => chunk.worker));
        return previous.map((chunk) => {
          if (chunk.status === "queued" && !busy.has(chunk.worker)) {
            busy.add(chunk.worker);
            return { ...chunk, status: "running", progress: 8 };
          }
          if (chunk.status === "running") {
            const nextProgress = Math.min(100, chunk.progress + 5 + ((tickRef.current * 5 + chunk.id.length) % 11));
            return { ...chunk, progress: nextProgress, status: nextProgress >= 100 ? "done" : "running" };
          }
          return chunk;
        });
      });
    }, 700);
    return () => clearInterval(id);
  }, [allDone]);

  const done = chunks.filter((chunk) => chunk.status === "done").length;
  const pct = Math.round(chunks.reduce((sum, chunk) => sum + chunk.progress, 0) / chunks.length);
  const cost = est.cost_usd * (pct / 100);
  const remainingPct = Math.max(0, 100 - pct);
  const etaSeconds = allDone ? 0 : Math.max(12, Math.round((remainingPct / 100) * est.eta_min * 60));
  const activeWorkers = new Set(chunks.filter((chunk) => chunk.status !== "queued").map((chunk) => chunk.worker)).size;
  const workerRows = WORKERS.slice(0, Math.min(WORKERS.length, chunkCount)).map((worker) => {
    const current =
      chunks.find((chunk) => chunk.worker === worker && chunk.status === "running") ??
      chunks.find((chunk) => chunk.worker === worker && chunk.status === "queued") ??
      chunks.filter((chunk) => chunk.worker === worker).at(-1);
    const index = current ? chunks.indexOf(current) + 1 : 0;
    return { worker, current, index };
  });

  return (
    <>
      <PageHeader
        title={`Job #${routeParams.id.slice(0, 3)} · ${meta.label} · ${allDone ? "complete" : "running"}`}
        subtitle={`${fileCount} input file${fileCount === 1 ? "" : "s"} · ${image}`}
        action={
          <div className="flex items-center gap-3">
            <PreviewBadge>Simulated</PreviewBadge>
            <LiveBadge live={!allDone} />
          </div>
        }
      />

      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-5">
          <p className="num text-sm text-muted">
            Cost so far <span className="text-lg font-semibold text-text">{usd(cost, 2)}</span> ·{" "}
            {Math.max(activeWorkers, est.workers)} workers · ETA {elapsedLabel(etaSeconds)}
          </p>
          <p className="num text-sm text-muted">
            {done}/{chunks.length} done · elapsed {elapsedLabel(elapsed)}
          </p>
        </div>

        <div className="mt-6 space-y-4">
          {workerRows.map(({ worker, current, index }) => (
            <div key={worker} className="grid grid-cols-[88px_1fr_92px] items-center gap-3 text-sm">
              <span className="truncate font-medium">{worker}</span>
              <div
                className="h-3 overflow-hidden rounded-full bg-surface-2"
                role="progressbar"
                aria-valuenow={current?.progress ?? 0}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${worker} progress`}
              >
                <div
                  className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${
                    current?.status === "done" ? "bg-accent" : "bg-accent/70"
                  }`}
                  style={{ width: `${current?.progress ?? 0}%` }}
                />
              </div>
              <span className="num text-right text-muted">
                {current?.status === "done" ? "done" : `chunk ${index}/${chunks.length}`}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-7 border-t border-border pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-medium">✓ {done}/{chunks.length} done — download as they finish</h2>
            <span className="text-xs text-muted">Results are preview links until backend returns output URLs.</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {chunks.slice(0, Math.max(done, Math.min(3, chunks.length))).map((chunk) => (
              <a
                key={chunk.id}
                href="#"
                onClick={(event) => event.preventDefault()}
                aria-disabled={chunk.status !== "done"}
                className={`inline-flex h-9 items-center rounded-lg border px-3 text-sm transition-colors ${
                  chunk.status === "done"
                    ? "border-accent/50 text-text hover:bg-accent/10"
                    : "pointer-events-none border-border text-muted opacity-45"
                }`}
              >
                ↓ {chunk.outputName}
              </a>
            ))}
          </div>
        </div>
      </Card>

      <div className="mt-4 flex gap-3">
        <Button href="/rent" variant="ghost">Run another job</Button>
      </div>
    </>
  );
}
