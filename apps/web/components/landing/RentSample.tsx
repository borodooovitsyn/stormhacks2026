import { FloodMap } from "@/components/FloodMap";
import { PreviewBadge, sol } from "@/components/ui";
import { estimateJob } from "@/lib/pending";

// Same estimate maths as /rent, so the sample matches what a visitor will see there.
const UNITS = 50;

export function RentSample() {
  const est = estimateJob("blender", UNITS);
  return (
    <figure className="rounded-2xl border border-border bg-surface p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm text-muted">gpu-share/blender:cuda</span>
        <PreviewBadge>Sample</PreviewBadge>
      </div>
      <FloodMap />
      <figcaption className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="num text-sm text-muted">
          {UNITS} frames · {est.chunks} chunks · ~{est.eta_min} min
        </span>
        <span className="num text-lg font-semibold text-accent">{sol(est.cost_usd)}</span>
      </figcaption>
      <p className="mt-2 text-xs text-muted">Same UI works for audio, images, Blender, LLM, or a custom image.</p>
    </figure>
  );
}
