import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DownloadClient } from "./DownloadClient";

type DownloadPageProps = {
  searchParams: Promise<{ code?: string }>;
};

export default async function DownloadPage({ searchParams }: DownloadPageProps) {
  const session = await auth();
  const params = await searchParams;
  const callbackUrl = `/download${params.code ? `?code=${encodeURIComponent(params.code)}` : ""}`;
  if (!session?.user) redirect(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);

  return (
    <Suspense fallback={<div className="skeleton h-96 w-full" />}>
      <DownloadClient />
    </Suspense>
  );
}
