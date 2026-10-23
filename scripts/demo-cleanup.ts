// Usage: npm run demo:cleanup
// Removes demo sandboxes unused for a day (the app also does this whenever a
// new demo starts). Real data is never touched.
import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });

import { createSql } from "../src/server/db/client";
import { cleanupSandboxes } from "../src/server/demo/sandbox";
import { ensureMetaSchema } from "../src/server/db/migrations";

async function main() {
  const sql = createSql(process.env.DATABASE_URL!, { max: 1 });
  try {
    await ensureMetaSchema(sql);
    const removed = await cleanupSandboxes(sql);
    console.log(`Removed ${removed} old demo sandbox(es).`);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
