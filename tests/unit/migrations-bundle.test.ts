import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MIGRATION_FILES } from "@/server/db/migrations-bundle";

describe("migrations bundle", () => {
  it("matches the SQL files in db/migrations (run npm run bundle-migrations if not)", () => {
    const dir = path.join(process.cwd(), "db", "migrations");
    const files = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort()
      .map((name) => ({ name, sql: readFileSync(path.join(dir, name), "utf8") }));
    expect(MIGRATION_FILES).toEqual(files);
  });

  it("never qualifies table names with a schema, so sandboxes get their own tables", () => {
    for (const { name, sql } of MIGRATION_FILES) {
      expect(sql, name).not.toMatch(/\b(kitgap|public)\.\w+/);
    }
  });
});
