import { Button, PreviewBadge, usd } from "@/components/ui";
import { estimateJob } from "@/lib/pending";
import { Tooltip } from "@/components/ui/tooltip-card";
import { GpuSpin } from "@/components/GpuSpin";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Stop } from "@/components/landing/Stop";
import { RentSample } from "@/components/landing/RentSample";
import { PayoutFeed } from "@/components/landing/PayoutFeed";
import { ConnectStop } from "@/components/landing/ConnectStop";

const STEPS = [
  {
    t: "Dump your files on us",
    d: (
      <>
        Audio, images, Blender scenes, model inputs.{" "}
        <Tooltip content="Presets are convenience defaults. Custom workloads provide any Docker image that reads /input and writes /output.">
          Bring your container
        </Tooltip>{" "}
        and we run the same two-screen flow.
      </>
    ),
  },
  {
    t: "We chop it up",
    d: (
      <>
        The job is cut into{" "}
        <Tooltip content="Each chunk runs on a different provider’s GPU. When all are done, the results are merged back into one.">
          chunks
        </Tooltip>{" "}
        and run on idle GPUs in parallel.
      </>
    ),
  },
  {
    t: "Paid by the minute",
    d: (
      <>
        Usage is{" "}
        <Tooltip content="Billed from GPU utilization logs sampled every few seconds, not from what a provider claims.">
          metered
        </Tooltip>{" "}
        from real GPU logs; providers are paid on Solana.
      </>
    ),
  },
];

// Same sample job as the Rent section below, so the two numbers always agree.
const SAMPLE_UNITS = 50;

export default function Home() {
  const sample = estimateJob("blender", SAMPLE_UNITS);
  return (
    <div className="py-8 sm:py-20">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
        <div>
          <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Rent a GPU by the minute. Or get paid for yours.
            <span className="cursor text-accent" aria-hidden>_</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted">
            Cloud GPUs are priced for companies. Your gaming rig sits idle most of the day. We match the two and pay by
            the minute in Solana. No card, no cloud account.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/rent">Rent a GPU</Button>
            <Button href="/provider" variant="ghost">Put my GPU to work</Button>
          </div>
          <p className="num mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <PreviewBadge>Sample</PreviewBadge>
            <span>
              Blender render, {sample.chunks} chunks, ~{sample.eta_min} min:
            </span>
            <span className="text-lg font-semibold text-accent">{usd(sample.cost_usd)}</span>
          </p>
        </div>
        <GpuSpin />
      </div>

      <dl className="mt-20 grid gap-8 sm:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.t} className="border-t border-border pt-4">
            <dt className="font-medium">{s.t}</dt>
            <dd className="mt-1.5 text-sm text-muted">{s.d}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-20">
        <Stop
          id="rent"
          title="Throw a container at it."
          body="Pick a preset or paste any Docker image, drop input files, and see the cost before you press go. You pay for measured minutes, not a guess."
          actions={<Button href="/rent">Start a rental</Button>}
          object={<RentSample />}
        />
        <Stop
          id="provide"
          flip
          title="Your GPU is napping. Wake it up."
          body="Set a VRAM cap and a schedule, then let jobs run while you’re away. Earnings are metered per minute and paid out in Solana."
          actions={
            <>
              <Button href="/provider">Open provider dashboard</Button>
              <Button href="/download" variant="ghost">Get the desktop app</Button>
            </>
          }
          object={<PayoutFeed />}
        />
        <ConnectStop />
      </div>
      <SmoothScroll />
    </div>
  );
}
