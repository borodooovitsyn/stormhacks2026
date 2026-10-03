import { Button } from "@/components/ui";
import { Tooltip } from "@/components/ui/tooltip-card";

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
      <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
        Rent a GPU by the minute. Or get paid for yours.
      </h1>
      <p className="mt-6 max-w-xl text-lg text-muted">
        Cloud GPUs are priced for companies. Your gaming rig sits idle most of the day. We match the two and pay by
        the minute in Solana. No card, no cloud account.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button href="/rent">Rent a GPU</Button>
        <Button href="/download" variant="ghost">Put my GPU to work</Button>
      </div>

      <dl className="mt-20 grid gap-8 sm:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.t} className="border-t border-border pt-4">
            <dt className="font-medium">{s.t}</dt>
            <dd className="mt-1.5 text-sm text-muted">{s.d}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
