import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import PostgresAdapter from "@auth/pg-adapter";
import { Pool } from "pg";

const globalForAuth = globalThis as typeof globalThis & {
  authPool?: Pool;
};

const resendApiKey = process.env.AUTH_RESEND_KEY?.trim();
export const isResendConfigured = Boolean(
  resendApiKey && resendApiKey !== "re_your_api_key" && resendApiKey !== "re_replace_me",
);

const connectionString =
  process.env.AUTH_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5433/gpushare";

const pool =
  globalForAuth.authPool ??
  new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 2_000,
  });

if (process.env.NODE_ENV !== "production") globalForAuth.authPool = pool;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PostgresAdapter(pool),
  providers: isResendConfigured
    ? [
        Resend({
          apiKey: resendApiKey,
          from: process.env.AUTH_EMAIL_FROM ?? "CoreWhore <onboarding@resend.dev>",
          maxAge: 10 * 60,
        }),
      ]
    : [],
  pages: {
    signIn: "/sign-in",
    verifyRequest: "/sign-in/verify",
    error: "/sign-in",
  },
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
});
