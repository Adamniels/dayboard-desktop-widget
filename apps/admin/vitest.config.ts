import { defineConfig } from "vitest/config";

// JSON reporter writes test-results.json for the status generator; jsdom for component
// tests. No admin tests yet (passWithNoTests), but the config keeps the convention ready.
export default defineConfig({
  test: {
    environment: "jsdom",
    reporters: ["default", "json"],
    outputFile: "./test-results.json",
  },
});
