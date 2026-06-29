// Flat ESLint config. The notable rule is the purity boundary on packages/core:
// no clock, no IO, no DB imports. This structurally enforces core-stays-pure.
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/*.test-d.ts"],
  },
  ...tseslint.configs.recommended,
  {
    // Purity boundary for the pure domain package.
    files: ["packages/core/src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "pg", message: "packages/core stays pure: no DB access." },
            { name: "drizzle-orm", message: "packages/core stays pure: no DB access." },
            { name: "fs", message: "packages/core stays pure: no IO." },
            { name: "node:fs", message: "packages/core stays pure: no IO." },
            { name: "http", message: "packages/core stays pure: no network." },
            { name: "node:http", message: "packages/core stays pure: no network." },
          ],
          patterns: ["**/db/**", "**/api/**"],
        },
      ],
      "no-restricted-properties": [
        "error",
        { object: "Date", property: "now", message: "packages/core stays pure: pass `now: Date` in." },
      ],
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "packages/core stays pure: no network." },
      ],
    },
  },
);
