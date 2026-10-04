// Seed 3 pre-verified demo accounts (skips email verification) + link wallets.
// Usage: node apps/web/scripts/seed-accounts.mjs
// Needs: Postgres up (make db) and the backend up (make api) for wallet linking.

import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import pg from "pg";

const { Pool } = pg;

const scryptAsync = promisify(scrypt);

// ---- EDIT THESE: 3 providers (email / password / payable wallet) ----
const ACCOUNTS = [
  { email: "provider1@coreshare.dev", password: "password123", wallet: "PASTE_PAYABLE_1" },
  { email: "provider2@coreshare.dev", password: "password123", wallet: "PASTE_PAYABLE_2" },
  { email: "provider3@coreshare.dev", password: "password123", wallet: "PASTE_PAYABLE_3" },
];
// ---------------------------------------------------------------------

const DB_URL = process.env.AUTH_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5433/gpushare";
const API_URL = process.env.API_URL ?? "http://localhost:8000";

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await scryptAsync(password, salt, 64);
  return `scrypt$${salt}$${key.toString("hex")}`;
}

async function main() {
  const pool = new Pool({ connectionString: DB_URL });
  for (const acc of ACCOUNTS) {
    const hash = await hashPassword(acc.password);
    // Upsert a verified user (emailVerified = NOW() => login works, no email step).
    await pool.query(
      `INSERT INTO users (email, password_hash, "emailVerified")
       VALUES (LOWER($1), $2, NOW())
       ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash, "emailVerified" = NOW()`,
      [acc.email, hash],
    );
    console.log(`seeded user: ${acc.email}  (password: ${acc.password})`);

    // Link email -> wallet in the backend identity store.
    try {
      const r = await fetch(`${API_URL}/accounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: acc.email.toLowerCase(), wallet: acc.wallet }),
      });
      console.log(`  linked wallet ${acc.wallet}: ${r.ok ? "ok" : "FAILED " + r.status}`);
    } catch (e) {
      console.log(`  wallet link skipped (backend down?): ${e.message}`);
    }
  }
  await pool.end();
  console.log("\nDone. Log in on the web with the email + password above (no verification needed).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
