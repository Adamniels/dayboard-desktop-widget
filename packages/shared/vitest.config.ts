import { defineConfig } from "vitest/config";

// JSON reporter writes test-results.json at the package root for the status generator
// (scripts/verify-status.mjs). The file path of each suite contains "shared", which is
// how docs/verification-map.json matches shared-scoped requirements.
export default defineConfig({
  test: {
    reporters: ["default", "json"],
    outputFile: "./test-results.json",
  },
});
