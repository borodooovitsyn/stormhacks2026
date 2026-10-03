import { Suspense } from "react";
import { JobView } from "./JobView";

export default function JobPage() {
  return (
    <Suspense fallback={<div className="skeleton h-96 w-full" />}>
      <JobView />
    </Suspense>
  );
}
