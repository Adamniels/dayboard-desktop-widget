import { defineConfig } from "vitest/config";

// JSON reporter writes test-results.json at the package root for the status generator.
// Suite file paths contain "core", which is how docs/verification-map.json matches
// core-scoped requirements (recurrence, scheduling, surfaced todos, purity).
export default defineConfig({
  test: {
    reporters: ["default", "json"],
    outputFile: "./test-results.json",
  },
});
