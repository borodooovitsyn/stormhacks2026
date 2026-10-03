"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { JOB_TYPES, estimateJob, type Chunk, type JobType } from "@/lib/pending";
import { Button, Card, LiveBadge, PageHeader, PreviewBadge, Stat, usd } from "@/components/ui";
import { FloodMap } from "@/components/FloodMap";

const WORKERS = ["rtx-4090 · lab-3", "rtx-3090 · dorm-12", "rtx-3080 · home-7"];

// Local simulation until GET /jobs/{id} exists. Tick = 600 ms.
export function JobView() {
  const params = useSearchParams();
  const type: JobType = params.get("type") === "whisper" ? "whisper" : "segmentation";
  const units = Math.max(1, Number(params.get("units")) || 8);
  const est = useMemo(() => estimateJob(type, units), [type, units]);

  const [chunks, setChunks] = useState<Chunk[]>(() =>
    Array.from({ length: est.chunks }, (_, i) => ({
      id: `chunk-${i + 1}`,
      worker: WORKERS[i % WORKERS.length],
      status: "queued",
      progress: 0,
    })),
  );
  const [elapsed, setElapsed] = useState(0);
  const tickRef = useRef(0);

  const allDone = chunks.every((c) => c.status === "done");

  useEffect(() => {
    if (allDone) return;
    const id = setInterval(() => {
      tickRef.current += 1;
      setElapsed((e) => e + 0.6);
      setChunks((prev) => {
        // each worker runs its chunks one at a time
        const busy = new Set(prev.filter((c) => c.status === "running").map((c) => c.worker));
        return prev.map((c) => {
          if (c.status === "queued" && !busy.has(c.worker)) {
            busy.add(c.worker);
            return { ...c, status: "running", progress: 5 };
          }
          if (c.status === "running") {
            const p = Math.min(100, c.progress + 6 + ((tickRef.current * 7 + c.id.length) % 9));
            return { ...c, progress: p, status: p >= 100 ? "done" : "running" };
          }
          return c;
        });
      });
    }, 600);
    return () => clearInterval(id);
  }, [allDone]);

  const done = chunks.filter((c) => c.status === "done").length;
  const pct = Math.round(chunks.reduce((s, c) => s + c.progress, 0) / chunks.length);
  const cost = est.cost_usd * (pct / 100);
  const rate = allDone ? 0 : est.cost_usd / (est.eta_min * 60);

  return (
    <>
      <PageHeader
        title={JOB_TYPES[type].label}
        subtitle={`${units} ${JOB_TYPES[type].unit}${units > 1 ? "s" : ""} across ${Math.min(WORKERS.length, chunks.length)} provider GPUs.`}
        action={
          <div className="flex items-center gap-3">
            <PreviewBadge>Simulated</PreviewBadge>
            <LiveBadge live={!allDone} />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Running cost" value={usd(cost)} hint={allDone ? "final" : `${usd(rate * 60)} / min`} />
        <Stat label="Progress" value={`${pct}%`} hint={`${done} of ${chunks.length} chunks done`} />
        <Stat label="Elapsed" value={`${Math.floor(elapsed / 60)}:${String(Math.floor(elapsed % 60)).padStart(2, "0")}`} />
      </div>

      <Card className="mt-4">
        <h2 className="mb-4 font-medium">Chunks per worker</h2>
        <ul className="space-y-3">
          {chunks.map((c) => (
            <li key={c.id} className="grid grid-cols-[88px_1fr_44px] items-center gap-3 text-sm sm:grid-cols-[88px_200px_1fr_44px]">
              <span className="font-mono text-muted">{c.id}</span>
              <span className="hidden truncate sm:block">{c.worker}</span>
              <div
                className="h-2 overflow-hidden rounded-full bg-surface-2"
                role="progressbar"
                aria-valuenow={c.progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={c.id}
              >
                <div
                  className={`h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none ${
                    c.status === "done" ? "bg-accent" : "bg-accent/60"
                  }`}
                  style={{ width: `${c.progress}%` }}
                />
              </div>
              <span className="num text-right text-muted">{c.progress}%</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-medium">{type === "segmentation" ? "Flood map" : "Transcripts"}</h2>
          {allDone && type === "segmentation" && (
            <span className="text-xs text-muted">Water pixels in blue</span>
          )}
        </div>
        {!allDone ? (
          <div className="skeleton h-72 w-full" aria-label="Result will appear when all chunks finish" />
        ) : type === "segmentation" ? (
          <FloodMap />
        ) : (
          <p className="text-sm text-muted">
            {units} transcripts ready. (Result download needs the jobs endpoint.)
          </p>
        )}
        {allDone && (
          <div className="mt-4">
            <Button href="/rent" variant="ghost">Run another job</Button>
          </div>
        )}
      </Card>
    </>
  );
}
