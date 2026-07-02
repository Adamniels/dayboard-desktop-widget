import { describe, expect, it } from "vitest";
import { deleteConfirmCopy, describeTarget } from "./confirm-model";

// FR-EVT-4 / FR-PROJ-2 / FR-TODO-3 / FR-NOTE-2: destructive admin actions confirm first.
// The describe text contains "delete confirmation" so docs/verification-map.json resolves
// these requirements to this suite.
describe("delete confirmation", () => {
  it("names the event being deleted and offers a Delete action", () => {
    const copy = deleteConfirmCopy("event", "Standup");
    expect(copy.title).toBe("Delete event?");
    expect(copy.body).toContain('"Standup"');
    expect(copy.body).toContain("can't be undone");
    expect(copy.confirmLabel).toBe("Delete");
  });

  it("warns that deleting a project also removes its to-dos", () => {
    const copy = deleteConfirmCopy("project", "Website");
    expect(copy.title).toBe("Delete project?");
    expect(copy.body).toContain('"Website"');
    expect(copy.body).toContain("to-dos");
  });

  it("falls back to a generic phrase when there is no label", () => {
    expect(describeTarget("todo", "")).toBe("this to-do");
    expect(describeTarget("note", null)).toBe("this note");
    expect(describeTarget("todo", "   ")).toBe("this to-do");
  });

  it("uses the label when present, trimmed", () => {
    expect(describeTarget("todo", "  Buy milk  ")).toBe('"Buy milk"');
  });

  it("truncates a very long label so the dialog can't blow out", () => {
    const long = "x".repeat(200);
    const shown = describeTarget("note", long);
    expect(shown.length).toBeLessThan(65);
    expect(shown).toContain("…");
  });

  it("gives each kind its own title", () => {
    expect(deleteConfirmCopy("event").title).toBe("Delete event?");
    expect(deleteConfirmCopy("project").title).toBe("Delete project?");
    expect(deleteConfirmCopy("todo").title).toBe("Delete to-do?");
    expect(deleteConfirmCopy("note").title).toBe("Delete note?");
  });
});
