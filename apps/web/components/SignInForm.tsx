"use client";

import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type SignInFormProps = {
  callbackUrl: string;
  hasError: boolean;
  verified: boolean;
};

export function SignInForm({ callbackUrl, hasError, verified }: SignInFormProps) {
  const router = useRouter();
  const { update } = useSession();
  const [error, setError] = useState(hasError);
  const [pending, setPending] = useState(false);

  return (
    <>
      {verified && (
        <p role="status" className="mb-4 text-sm text-accent">
          Email verified. You can sign in now.
        </p>
      )}
      {error && (
        <p role="alert" className="mb-4 text-sm text-danger">
          Incorrect credentials, or the email has not been verified yet.
        </p>
      )}
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError(false);

          const form = new FormData(event.currentTarget);
          const email = String(form.get("email") ?? "");
          const password = String(form.get("password") ?? "");
          const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
          });

          if (result?.error) {
            setError(true);
            setPending(false);
            return;
          }

          await update();
          router.replace(callbackUrl);
          router.refresh();
        }}
        className="space-y-4"
      >
        <label className="block">
          <span className="text-sm font-medium">Email address</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            required
            autoFocus
            placeholder="you@example.com"
            className="mt-2 h-11 w-full rounded-lg border border-border bg-bg px-3 text-text outline-none transition-colors placeholder:text-muted focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Password</span>
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            minLength={8}
            className="mt-2 h-11 w-full rounded-lg border border-border bg-bg px-3 text-text outline-none transition-colors focus:border-accent"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-ink transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-sm text-muted">
        New here?{" "}
        <Link href="/register" className="font-medium text-text hover:text-accent">
          Create an account
        </Link>
      </p>
    </>
  );
}
