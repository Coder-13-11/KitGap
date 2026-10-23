// Usage: npm run db:migrate
// Applies db/migrations to the "kitgap" schema of DATABASE_URL.
import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });

import { createSql, LIVE_SCHEMA } from "../src/server/db/client";
import { migrateSchema } from "../src/server/db/migrations";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (see .env.example)");
  const sql = createSql(url, { max: 1 });
  try {
    const applied = await migrateSchema(sql, LIVE_SCHEMA);
    console.log(applied.length ? `Applied: ${applied.join(", ")}` : "Database is up to date.");
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
