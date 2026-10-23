// Usage: npm run db:make-reviewer -- person@example.org
// Grants KitGap reviewer access to an existing account. This is deliberately
// a command for whoever runs KitGap, not something the app can do.
import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });

import { createSql, LIVE_SCHEMA } from "../src/server/db/client";

async function main() {
  const email = process.argv[2];
  if (!email) throw new Error("Give the reviewer's email address: npm run db:make-reviewer -- person@example.org");
  const sql = createSql(process.env.DATABASE_URL!, { max: 1 });
  try {
    const [user] = await sql`select id from auth.users where lower(email) = lower(${email})`;
    if (!user) throw new Error(`No account with email ${email}. They need to sign up and sign in once first.`);
    const [profile] = await sql`select id from ${sql(LIVE_SCHEMA)}.profiles where id = ${user.id}`;
    if (!profile) throw new Error(`${email} hasn't signed in to KitGap yet. Ask them to sign in once, then run this again.`);
    await sql`insert into ${sql(LIVE_SCHEMA)}.platform_admins (user_id) values (${user.id}) on conflict do nothing`;
    console.log(`${email} is now a KitGap reviewer.`);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
