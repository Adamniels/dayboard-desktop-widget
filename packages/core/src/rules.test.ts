import type { Todo } from "@dayboard/shared";
import { describe, expect, it } from "vitest";
import type { Occurrence } from "./occurrences";
import { type LinkedOccurrence, nowNext, resolveEventColor, surfaceTodos } from "./rules";

function occ(startIso: string, endIso: string): Occurrence {
  return { start: new Date(startIso), end: new Date(endIso), isOverride: false, cancelled: false };
}

function linked(startIso: string, endIso: string, projectId: string | null): LinkedOccurrence {
  return { ...occ(startIso, endIso), projectId };
}

function todo(partial: Partial<Todo> & Pick<Todo, "id" | "projectId">): Todo {
  return {
    title: "task",
    status: "open",
    dueAt: null,
    completedAt: null,
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    updatedAt: new Date("2026-06-01T00:00:00.000Z"),
    ...partial,
  };
}

describe("nowNext", () => {
  const occurrences = [
    occ("2026-06-29T09:00:00.000Z", "2026-06-29T10:00:00.000Z"),
    occ("2026-06-29T14:00:00.000Z", "2026-06-29T15:00:00.000Z"),
    occ("2026-06-29T16:00:00.000Z", "2026-06-29T17:00:00.000Z"),
  ];

  it("returns the occurrence containing now as current", () => {
    const { current } = nowNext(new Date("2026-06-29T14:30:00.000Z"), occurrences);
    expect(current?.start.toISOString()).toBe("2026-06-29T14:00:00.000Z");
  });

  it("returns the soonest future occurrence as next", () => {
    const { next } = nowNext(new Date("2026-06-29T14:30:00.000Z"), occurrences);
    expect(next?.start.toISOString()).toBe("2026-06-29T16:00:00.000Z");
  });

  it("has no current in a gap between occurrences", () => {
    const { current, next } = nowNext(new Date("2026-06-29T12:00:00.000Z"), occurrences);
    expect(current).toBeNull();
    expect(next?.start.toISOString()).toBe("2026-06-29T14:00:00.000Z");
  });
});

// FR-TODO-2: the describe text contains "surface todos during linked block".
describe("surface todos during linked block", () => {
  const now = new Date("2026-06-29T14:30:00.000Z");
  const insideP1 = linked("2026-06-29T14:00:00.000Z", "2026-06-29T15:00:00.000Z", "p1");
  const elsewhere = linked("2026-06-29T09:00:00.000Z", "2026-06-29T10:00:00.000Z", "p2");

  const todos = [
    todo({ id: "a", projectId: "p1", status: "open", dueAt: new Date("2026-07-02T00:00:00.000Z") }),
    todo({ id: "b", projectId: "p1", status: "open", dueAt: new Date("2026-07-01T00:00:00.000Z") }),
    todo({ id: "c", projectId: "p1", status: "done" }),
    todo({ id: "d", projectId: "p2", status: "open" }),
  ];

  it("returns the active project's open todos ordered by dueAt", () => {
    const result = surfaceTodos(now, [insideP1, elsewhere], todos);
    expect(result.map((t) => t.id)).toEqual(["b", "a"]); // earlier due first; done and p2 excluded
  });

  it("returns nothing when now is outside every linked event", () => {
    const result = surfaceTodos(new Date("2026-06-29T20:00:00.000Z"), [insideP1, elsewhere], todos);
    expect(result).toEqual([]);
  });

  it("ignores events with no project link", () => {
    const unlinked = linked("2026-06-29T14:00:00.000Z", "2026-06-29T15:00:00.000Z", null);
    expect(surfaceTodos(now, [unlinked], todos)).toEqual([]);
  });
});

// FR-PROJ-4: the describe text contains "project color wins" so the verification map
// resolves this suite.
describe("event color resolution (project color wins)", () => {
  it("uses the linked project's color over the type color", () => {
    expect(resolveEventColor("#E2A23B", "#3FB8AF")).toBe("#E2A23B");
  });

  it("falls back to the type color when the project has none", () => {
    expect(resolveEventColor(null, "#3FB8AF")).toBe("#3FB8AF");
    expect(resolveEventColor(undefined, "#7C6CF6")).toBe("#7C6CF6");
  });

  it("treats a blank project color as absent", () => {
    expect(resolveEventColor("   ", "#3FB8AF")).toBe("#3FB8AF");
    expect(resolveEventColor("", "#3FB8AF")).toBe("#3FB8AF");
  });
});
