import { randomBytes, scrypt } from "node:crypto"; import { promisify } from "node:util"; import pg from "pg";
const { Pool } = pg; const s = promisify(scrypt);
const pool = new Pool({ connectionString: "postgresql://postgres:postgres@localhost:5434/gpushare" });
const salt = randomBytes(16).toString("hex"); const key = await s("testpass123", salt, 64);
await pool.query(`INSERT INTO users (email,password_hash,"emailVerified") VALUES (LOWER($1),$2,NOW()) ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash,"emailVerified"=NOW()`, ["seedtest@coreshare.dev", `scrypt$${salt}$${key.toString("hex")}`]);
console.log("DB row:", (await pool.query('SELECT email,"emailVerified" IS NOT NULL verified, password_hash IS NOT NULL has_pw FROM users WHERE email=$1',["seedtest@coreshare.dev"])).rows[0]);
const link = await fetch("http://localhost:8000/accounts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:"seedtest@coreshare.dev",wallet:"TestWallet999"})});
console.log("backend link:", link.ok?"ok":"FAIL", await link.json());
await pool.end();
