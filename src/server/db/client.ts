// The one place that opens database connections. Only server code imports
// this; the connection string never reaches the browser.

import postgres from "postgres";

export type Sql = postgres.Sql;
export type Tx = postgres.TransactionSql;

declare global {
  // Reused across hot reloads in development so we don't leak pools.
  var __kitgapSql: postgres.Sql | undefined;
}

export function createSql(url: string, options: { max?: number } = {}): postgres.Sql {
  return postgres(url, {
    // Supabase's transaction pooler does not support prepared statements.
    prepare: false,
    max: options.max ?? Number(process.env.DATABASE_POOL_SIZE ?? 5),
    idle_timeout: 20,
    connect_timeout: 15,
    onnotice: () => {},
    // snake_case columns <-> camelCase fields, so rows match src/domain/types.ts.
    transform: { ...postgres.camel, undefined: null },
    types: {
      // Keep "date" columns as "YYYY-MM-DD" strings. Parsing them into a
      // JavaScript Date would attach a timezone and could shift the day.
      calendarDate: {
        to: 1082,
        from: [1082],
        serialize: (value: string) => value,
        parse: (value: string) => value,
      },
    },
  });
}

export function db(): postgres.Sql {
  if (!globalThis.__kitgapSql) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
    }
    globalThis.__kitgapSql = createSql(url);
  }
  return globalThis.__kitgapSql;
}

// Schemas the app may run in: the real data, or one visitor's demo sandbox.
export const LIVE_SCHEMA = "kitgap";
const SANDBOX_SCHEMA = /^kgdemo_[0-9a-f]{24}$/;

export function isAppSchema(name: string): boolean {
  return name === LIVE_SCHEMA || SANDBOX_SCHEMA.test(name);
}

export function isSandboxSchema(name: string): boolean {
  return SANDBOX_SCHEMA.test(name);
}

// Run `work` in one transaction whose unqualified table names resolve only to
// `schema`. A demo sandbox transaction therefore cannot reach real data.
export async function inSchema<T>(sql: postgres.Sql, schema: string, work: (tx: Tx) => Promise<T>): Promise<T> {
  if (!isAppSchema(schema)) throw new Error(`Refusing to use unknown schema ${schema}`);
  const result = await sql.begin(async (tx) => {
    await tx`select set_config('search_path', ${schema}, true)`;
    return work(tx);
  });
  return result as T;
}
