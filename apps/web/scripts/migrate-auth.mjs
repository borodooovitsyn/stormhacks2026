import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";

const databaseUrl = process.env.AUTH_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("AUTH_DATABASE_URL is required. Copy .env.example to .env.local first.");
}

const schemaUrl = new URL("../auth-schema.sql", import.meta.url);
const sql = await readFile(fileURLToPath(schemaUrl), "utf8");
const client = new pg.Client({ connectionString: databaseUrl });

await client.connect();
try {
  await client.query("BEGIN");
  await client.query(sql);
  await client.query("COMMIT");
  console.log("Auth tables are ready.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
