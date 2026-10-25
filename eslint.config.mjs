import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Apostrophes in JSX text are safe and common in plain-language copy.
      "react/no-unescaped-entities": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "supabase/**",
    "test-results/**",
    // Native app projects (Capacitor) and their build output.
    "android/**",
    "ios/**",
    "mobile/**",
    "playwright-report/**",
    ".shots.mjs",
  ]),
]);

export default eslintConfig;
