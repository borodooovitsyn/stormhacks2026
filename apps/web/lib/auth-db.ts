import { Pool } from "pg";

const globalForAuth = globalThis as typeof globalThis & { authPool?: Pool };

const connectionString =
  process.env.AUTH_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5433/gpushare";

export const authPool =
  globalForAuth.authPool ??
  new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 2_000,
  });

if (process.env.NODE_ENV !== "production") globalForAuth.authPool = authPool;
