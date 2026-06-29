import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// NFR-MAINT-1: packages/core stays pure (no clock, IO, or DB). This guard scans the
// source tree and fails if any non-test file reaches for those. The describe text
// contains "core stays pure" so docs/verification-map.json resolves it.
const SRC = dirname(fileURLToPath(import.meta.url));

const FORBIDDEN: Array<{ label: string; pattern: RegExp }> = [
  { label: "Date.now()", pattern: /Date\.now\s*\(/ },
  { label: "node fs", pattern: /from\s+["'](?:node:)?fs["']/ },
  { label: "node http", pattern: /from\s+["'](?:node:)?https?["']/ },
  { label: "pg", pattern: /from\s+["']pg["']/ },
  { label: "drizzle-orm", pattern: /from\s+["']drizzle-orm/ },
  { label: "global fetch", pattern: /\bfetch\s*\(/ },
];

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
    } else if (name.endsWith(".ts") && !name.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

describe("core stays pure", () => {
  it("imports no clock, IO, or DB modules", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const content = readFileSync(file, "utf8");
      for (const { label, pattern } of FORBIDDEN) {
        if (pattern.test(content)) {
          offenders.push(`${file}: ${label}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
