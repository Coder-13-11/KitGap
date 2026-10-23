// Applies the migrations in db/migrations, in name order, to one schema. The same files
// build the real "kitgap" schema and every demo sandbox, so a sandbox always
// has exactly the real tables, constraints and indexes.

import { createHash } from "node:crypto";
import type { Sql } from "./client";
import { isAppSchema } from "./client";
import { MIGRATION_FILES } from "./migrations-bundle";

export interface Migration {
  name: string;
  sql: string;
  checksum: string;
}

// The SQL text comes from db/migrations via the generated bundle module, so
// it is always deployed with the server code.
export function loadMigrations(): Migration[] {
  return MIGRATION_FILES.map(({ name, sql }) => ({
    name,
    sql,
    checksum: createHash("sha256").update(sql).digest("hex"),
  }));
}

export async function ensureMetaSchema(sql: Sql): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext('kitgap_meta'))`;
    await tx.unsafe(`
      create schema if not exists kitgap_meta;
      create table if not exists kitgap_meta.applied_migrations (
        schema_name text not null,
        name text not null,
        checksum text not null,
        applied_at timestamptz not null default now(),
        primary key (schema_name, name)
      );
      create table if not exists kitgap_meta.demo_sandboxes (
        schema_name text primary key,
        created_at timestamptz not null default now(),
        last_used_at timestamptz not null default now()
      );
      alter table kitgap_meta.applied_migrations enable row level security;
      alter table kitgap_meta.demo_sandboxes enable row level security;
    `);
    await tx.unsafe(`
      do $$
      begin
        if exists (select 1 from pg_roles where rolname = 'anon') then
          revoke all on all tables in schema kitgap_meta from anon, authenticated;
          revoke all on schema kitgap_meta from anon, authenticated;
        end if;
      end
      $$;
    `);
  });
}

// Returns the names of migrations applied by this call.
export async function migrateSchema(sql: Sql, schema: string, migrations = loadMigrations()): Promise<string[]> {
  if (!isAppSchema(schema)) throw new Error(`Refusing to migrate unknown schema ${schema}`);
  await ensureMetaSchema(sql);
  const applied: string[] = [];
  for (const migration of migrations) {
    const didApply = await sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(hashtext(${"kitgap_migrate:" + schema}))`;
      const [existing] = await tx`
        select checksum from kitgap_meta.applied_migrations
        where schema_name = ${schema} and name = ${migration.name}
      `;
      if (existing) {
        if (existing.checksum !== migration.checksum) {
          throw new Error(
            `Migration ${migration.name} changed after it was applied to ${schema}. Add a new migration instead of editing an applied one.`,
          );
        }
        return false;
      }
      await tx.unsafe(`create schema if not exists ${schema}`);
      await tx`select set_config('search_path', ${schema}, true)`;
      await tx.unsafe(migration.sql);
      await tx`
        insert into kitgap_meta.applied_migrations (schema_name, name, checksum)
        values (${schema}, ${migration.name}, ${migration.checksum})
      `;
      return true;
    });
    if (didApply) applied.push(migration.name);
  }
  return applied;
}

export async function dropSchema(sql: Sql, schema: string): Promise<void> {
  if (!isAppSchema(schema)) throw new Error(`Refusing to drop unknown schema ${schema}`);
  await sql.begin(async (tx) => {
    await tx.unsafe(`drop schema if exists ${schema} cascade`);
    await tx`delete from kitgap_meta.applied_migrations where schema_name = ${schema}`;
  });
}
