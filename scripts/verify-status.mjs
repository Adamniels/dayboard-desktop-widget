#!/usr/bin/env node
// verify-status.mjs — generate docs/STATUS.md from docs/verification-map.json plus
// every test-results.json on disk. Pure Node, no dependencies, runs in the sandbox.
// See docs/verification.md. Never hand-edit docs/STATUS.md.

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = join(HERE, "..");

// --- collecting test results -------------------------------------------------

// Recursively find test-results.json files, skipping node_modules and .git.
export function findTestResultFiles(root) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try { entries = readdirSync(dir); } catch { return; }
    for (const name of entries) {
      if (name === "node_modules" || name === ".git" || name === "dist") continue;
      const full = join(dir, name);
      let s;
      try { s = statSync(full); } catch { continue; }
      if (s.isDirectory()) walk(full);
      else if (name === "test-results.json") out.push(full);
    }
  };
  walk(root);
  return out;
}

// Flatten vitest-style JSON ({ testResults: [{ name, assertionResults:[...] }] })
// into [{ file, fullName, status }]. Tolerant of missing fields.
export function parseTestResults(reports) {
  const tests = [];
  for (const report of reports) {
    for (const suite of report?.testResults ?? []) {
      const file = suite?.name ?? "";
      for (const a of suite?.assertionResults ?? []) {
        const full = a?.fullName ?? [...(a?.ancestorTitles ?? []), a?.title ?? ""].join(" ").trim();
        tests.push({ file, fullName: full, status: a?.status ?? "unknown" });
      }
    }
  }
  return tests;
}

// --- classifying a requirement ----------------------------------------------

export function classifyRequirement(req, tests) {
  const type = String(req.type ?? "").toLowerCase();
  const isAuto = type.includes("auto");
  if (!isAuto) {
    if (type.includes("manual")) return { status: "MANUAL", detail: "human check" };
    if (type.includes("review")) return { status: "REVIEW", detail: "human review" };
    if (type === "na" || type.includes("n/a")) return { status: "N/A", detail: "" };
    if (type.includes("ci")) return { status: "CI", detail: "ci pipeline" };
    return { status: "MANUAL", detail: "human check" };
  }
  const matchers = req.testMatch ?? [];
  const matched = tests.filter((t) =>
    matchers.some(
      (m) =>
        (!m.file || t.file.includes(m.file)) &&
        (!m.name || t.fullName.toLowerCase().includes(String(m.name).toLowerCase()))
    )
  );
  if (matched.length === 0) return { status: "NO TEST", detail: "no matching test on disk" };
  const failed = matched.filter((t) => t.status !== "passed");
  if (failed.length > 0) return { status: "FAIL", detail: `${failed.length} failing` };
  return { status: "PASS", detail: `${matched.length} passing` };
}

// --- building the markdown ---------------------------------------------------

export function buildStatusMarkdown(map, tests) {
  const reqs = map.requirements ?? [];
  const rows = reqs.map((req) => {
    const { status, detail } = classifyRequirement(req, tests);
    return { id: req.id, story: req.story ?? "", type: req.type ?? "", status, detail };
  });

  const count = (s) => rows.filter((r) => r.status === s).length;
  const autoTotal = rows.filter((r) => String(r.type).toLowerCase().includes("auto")).length;
  const summary =
    `**${count("PASS")}** pass · **${count("FAIL")}** fail · **${count("NO TEST")}** no test ` +
    `(of ${autoTotal} automated) · **${count("MANUAL")}** manual · **${count("REVIEW")}** review`;

  const lines = [];
  lines.push("# STATUS — generated, do not edit");
  lines.push("");
  lines.push("> Produced by `node scripts/verify-status.mjs` from `docs/verification-map.json`");
  lines.push("> and on-disk `test-results.json`. Edit those, not this file. See");
  lines.push("> `docs/verification.md`.");
  lines.push("");
  lines.push(summary);
  lines.push("");
  lines.push(`Tests discovered on disk: ${tests.length}.`);
  lines.push("");
  lines.push("| Req ID | Story | Type | Status | Detail |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const r of rows) {
    lines.push(`| ${r.id} | ${r.story} | ${r.type} | ${r.status} | ${r.detail} |`);
  }
  lines.push("");
  lines.push("Legend: PASS every matched test passed · FAIL a matched test failed ·");
  lines.push("NO TEST an automated requirement matched nothing (a gap, not a pass) ·");
  lines.push("MANUAL / REVIEW human-verified, not gated on tests.");
  lines.push("");
  return lines.join("\n");
}

// --- main --------------------------------------------------------------------

export function generate(root = REPO_ROOT) {
  const mapPath = join(root, "docs", "verification-map.json");
  const map = JSON.parse(readFileSync(mapPath, "utf8"));
  const reportFiles = findTestResultFiles(root);
  const reports = reportFiles.map((f) => {
    try { return JSON.parse(readFileSync(f, "utf8")); } catch { return null; }
  }).filter(Boolean);
  const tests = parseTestResults(reports);
  const md = buildStatusMarkdown(map, tests);
  const outPath = join(root, "docs", "STATUS.md");
  writeFileSync(outPath, md);
  return { outPath, testCount: tests.length, reqCount: (map.requirements ?? []).length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const res = generate();
  console.log(`Wrote ${res.outPath} — ${res.reqCount} requirements, ${res.testCount} tests discovered.`);
}
