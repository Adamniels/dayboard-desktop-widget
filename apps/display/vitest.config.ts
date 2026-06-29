import { defineConfig } from "vitest/config";

// JSON reporter writes test-results.json at the package root for the status generator.
// Suite file paths contain "display", how docs/verification-map.json matches FR-VIEW-*.
// jsdom is set so component tests can mount; the pure week.test needs only Node.
export default defineConfig({
  test: {
    environment: "jsdom",
    reporters: ["default", "json"],
    outputFile: "./test-results.json",
  },
});
