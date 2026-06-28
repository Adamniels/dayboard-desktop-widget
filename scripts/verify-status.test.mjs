// Unit tests for the status generator. Pure Node — `node --test scripts/*.test.mjs`.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseTestResults,
  classifyRequirement,
  buildStatusMarkdown,
} from "./verify-status.mjs";

const reportWith = (file, name, status) => ({
  testResults: [{ name: file, assertionResults: [{ fullName: name, status }] }],
});

test("parseTestResults flattens vitest shape", () => {
  const tests = parseTestResults([reportWith("apps/api/api.integration.test.ts", "event crud creates", "passed")]);
  assert.equal(tests.length, 1);
  assert.equal(tests[0].file, "apps/api/api.integration.test.ts");
  assert.equal(tests[0].status, "passed");
});

test("parseTestResults builds fullName from ancestorTitles when missing", () => {
  const tests = parseTestResults([
    { testResults: [{ name: "f", assertionResults: [{ ancestorTitles: ["core", "last write wins"], title: "newer wins", status: "passed" }] }] },
  ]);
  assert.equal(tests[0].fullName, "core last write wins newer wins");
});

test("auto requirement reads PASS when a matcher hits a passing test", () => {
  const tests = parseTestResults([reportWith("packages/core/sync.test.ts", "reconcile last write wins newer", "passed")]);
  const req = { id: "FR-CAL-5", type: "auto", testMatch: [{ file: "core", name: "last write wins" }] };
  assert.equal(classifyRequirement(req, tests).status, "PASS");
});

test("auto requirement reads FAIL when a matched test failed", () => {
  const tests = parseTestResults([reportWith("packages/core/sync.test.ts", "reconcile last write wins newer", "failed")]);
  const req = { id: "FR-CAL-5", type: "auto", testMatch: [{ file: "core", name: "last write wins" }] };
  assert.equal(classifyRequirement(req, tests).status, "FAIL");
});

test("auto requirement reads NO TEST when nothing matches", () => {
  const req = { id: "FR-CAL-5", type: "auto", testMatch: [{ file: "core", name: "last write wins" }] };
  assert.equal(classifyRequirement(req, []).status, "NO TEST");
});

test("both file and name must match for a matcher to hit", () => {
  const tests = parseTestResults([reportWith("apps/display/view.test.ts", "last write wins", "passed")]);
  const req = { id: "X", type: "auto", testMatch: [{ file: "core", name: "last write wins" }] };
  assert.equal(classifyRequirement(req, tests).status, "NO TEST"); // name hits, file does not
});

test("manual and review types are not gated on tests", () => {
  assert.equal(classifyRequirement({ id: "A", type: "manual" }, []).status, "MANUAL");
  assert.equal(classifyRequirement({ id: "B", type: "review" }, []).status, "REVIEW");
});

test("auto+manual is driven by the auto part", () => {
  const tests = parseTestResults([reportWith("packages/core/r.test.ts", "recurrence expands occurrences ok", "passed")]);
  const req = { id: "FR-CAL-6", type: "auto+manual", testMatch: [{ file: "core", name: "recurrence expands occurrences" }] };
  assert.equal(classifyRequirement(req, tests).status, "PASS");
});

test("buildStatusMarkdown lists every requirement and a summary line", () => {
  const map = { requirements: [
    { id: "FR-1", story: "US-1", type: "auto", testMatch: [{ file: "core", name: "x" }] },
    { id: "NFR-1", story: "US-1", type: "manual" },
  ] };
  const md = buildStatusMarkdown(map, []);
  assert.match(md, /generated, do not edit/);
  assert.match(md, /\| FR-1 \|/);
  assert.match(md, /\| NFR-1 \|/);
  assert.match(md, /no test/);
});
