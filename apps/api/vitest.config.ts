import { defineConfig } from "vitest/config";

// Integration tests need Postgres, so they run on Adam's machine via `pnpm check`, not in
// the sandbox. globalSetup creates and migrates the test database; NODE_ENV=test routes
// the api to dayboard_test. Serial execution keeps DB state predictable. The JSON reporter
// feeds the status generator; suite paths contain "api.integration" for the matchers.
export default defineConfig({
  test: {
    reporters: ["default", "json"],
    outputFile: "./test-results.json",
    globalSetup: ["./test/global-setup.ts"],
    env: { NODE_ENV: "test" },
    fileParallelism: false,
    hookTimeout: 30_000,
    testTimeout: 20_000,
  },
});
