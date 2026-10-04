import { Button } from "@/components/ui";
import { Tooltip } from "@/components/ui/tooltip-card";
import { GpuSpin } from "@/components/GpuSpin";
import { SmoothScroll } from "@/components/SmoothScroll";
import { Stop } from "@/components/landing/Stop";
import { RentSample } from "@/components/landing/RentSample";
import { PayoutFeed } from "@/components/landing/PayoutFeed";
import { ConnectStop } from "@/components/landing/ConnectStop";

const STEPS = [
  {
    t: "Dump your workflows on us",
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

export default function Home() {
  return (
    <div className="py-8 sm:pt-20 sm:pb-20">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
        <div>
          <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            <Tooltip
              content="CoreShare is a peer-to-peer GPU marketplace. Renters send a job, we split it into chunks and run them on idle gaming GPUs, and providers get paid in Solana."
            >
              <span className="text-accent">CoreShare</span>
            </Tooltip>{" "}
            Rent a GPU by the minute. Or get paid for yours
            <span className="cursor text-accent" aria-hidden>_</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted">
            Idle gaming rigs meet people who need compute. Billed per minute in Solana. No card, no cloud account.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/rent">Rent a GPU</Button>
            <Button href="/provider" variant="ghost">Put my GPU to work</Button>
          </div>
        </div>
        <GpuSpin />
      </div>

      <section className="mt-20 grid gap-10 lg:grid-cols-[2fr_3fr] lg:gap-16" aria-labelledby="how">
        <h2 id="how" className="max-w-xs text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Three moves from file to payout.
        </h2>
        <dl className="divide-y divide-border">
          {STEPS.map((s) => (
            <div key={s.t} className="grid gap-1.5 py-6 first:pt-0 last:pb-0 sm:grid-cols-[14rem_1fr] sm:gap-8">
              <dt className="text-xl font-medium tracking-tight">{s.t}</dt>
              <dd className="text-sm text-muted">{s.d}</dd>
            </div>
          ))}
        </dl>
      </section>

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
