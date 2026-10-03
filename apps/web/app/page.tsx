import { Button } from "@/components/ui";
import { Tooltip } from "@/components/ui/tooltip-card";
import { GpuSpin } from "@/components/GpuSpin";
import { SmoothScroll } from "@/components/SmoothScroll";
import { ConnectCta } from "@/components/ConnectCta";

const STEPS = [
  {
    t: "Drop your files",
    d: (
      <>
        Satellite tiles or audio files.{" "}
        <Tooltip content="No arbitrary code. Jobs run in Docker with no network access and a read-only filesystem.">
          Fixed job types
        </Tooltip>{" "}
        only, so providers stay safe.
      </>
    ),
  },
  {
    t: "We slice it up",
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
    <div className="py-8 sm:py-20">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
        <div>
          <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Rent a GPU by the minute. Or get paid for yours.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted">
            Cloud GPUs are priced for companies. Your gaming rig sits idle most of the day. We match the two and pay by
            the minute in Solana. No card, no cloud account.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="#rent">Rent a GPU</Button>
            <Button href="#provide" variant="ghost">Put my GPU to work</Button>
          </div>
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

      {/* Each stop ends in a real route. The top padding keeps the heading clear of the sticky nav when anchored. */}
      <Stop id="rent" title="Rent a GPU" body="Upload satellite tiles or audio files, pick a job, and see the cost before you run it. You pay for measured minutes, not a guess.">
        <Button href="/rent">Start a rental</Button>
      </Stop>
      <Stop id="provide" title="Put a GPU to work" body="Set a VRAM cap and a schedule, then let jobs run while you’re away. Earnings are metered per minute and paid out in Solana.">
        <Button href="/provider">Open provider dashboard</Button>
        <Button href="/download" variant="ghost">Get the desktop app</Button>
      </Stop>
      <Stop id="connect" title="Connect your wallet" body="Phantom on Solana devnet. One signature to sign in, no email, no card.">
        <ConnectCta />
      </Stop>
      <SmoothScroll />
    </div>
  );
}

function Stop({ id, title, body, children }: { id: string; title: string; body: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-24 flex min-h-[60svh] flex-col justify-center border-t border-border pt-24 sm:mt-32">
      <h2 className="max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-5xl">{title}</h2>
      <p className="mt-5 max-w-xl text-lg text-muted">{body}</p>
      <div className="mt-8 flex flex-wrap gap-3">{children}</div>
    </section>
  );
}
