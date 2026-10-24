import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    setupFiles: ["tests/setup-env.ts"],
    // Integration tests share one database; run files one at a time.
    fileParallelism: false,
    // The longest scenarios make dozens of round trips; against a hosted
    // database that can take over 30 seconds.
    testTimeout: 120_000,
    hookTimeout: 60_000,
  },
});
