"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export function AccountSignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await signOut({ redirect: false });
        router.replace("/");
        router.refresh();
      }}
      className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold text-text transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
