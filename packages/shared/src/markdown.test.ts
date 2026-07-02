import { describe, expect, it } from "vitest";
import { parseInline, parseMarkdown, safeHref } from "./markdown";

// FR-NOTE-3: notes render as basic markdown (line breaks, bold, italic, bullet lists,
// safe links). The describe text contains "note markdown" so docs/verification-map.json
// resolves the requirement to this suite.
describe("note markdown", () => {
  it("keeps hard line breaks as separate lines in one paragraph", () => {
    const [block] = parseMarkdown("line one\nline two");
    expect(block).toEqual({
      type: "paragraph",
      lines: [[{ type: "text", text: "line one" }], [{ type: "text", text: "line two" }]],
    });
  });

  it("splits paragraphs on a blank line", () => {
    const blocks = parseMarkdown("a\n\nb");
    expect(blocks).toHaveLength(2);
    expect(blocks.every((b) => b.type === "paragraph")).toBe(true);
  });

  it("groups consecutive bullets into a list", () => {
    const blocks = parseMarkdown("- one\n- two\n* three");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ type: "list" });
    expect((blocks[0] as { items: unknown[] }).items).toHaveLength(3);
  });

  it("parses bold and italic runs", () => {
    expect(parseInline("a **b** c")).toEqual([
      { type: "text", text: "a " },
      { type: "strong", text: "b" },
      { type: "text", text: " c" },
    ]);
    expect(parseInline("*hi*")).toEqual([{ type: "em", text: "hi" }]);
  });

  it("parses a safe link and keeps its text", () => {
    expect(parseInline("see [docs](https://x.dev)")).toEqual([
      { type: "text", text: "see " },
      { type: "link", text: "docs", href: "https://x.dev" },
    ]);
  });

  it("refuses unsafe link schemes, showing them literally", () => {
    expect(safeHref("javascript:alert")).toBeNull();
    expect(parseInline("[x](javascript:alert)")).toEqual([
      { type: "text", text: "[x](javascript:alert)" },
    ]);
  });

  it("allows http, https and mailto", () => {
    expect(safeHref("http://a.com")).toBe("http://a.com");
    expect(safeHref("https://a.com")).toBe("https://a.com");
    expect(safeHref("mailto:me@a.com")).toBe("mailto:me@a.com");
  });
});
