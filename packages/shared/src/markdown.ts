// Tiny, dependency-free markdown for notes (FR-NOTE-3). Supports the agreed "basic"
// subset: paragraphs with hard line breaks, bullet lists (`- ` or `* `), **bold**,
// *italic*, and [text](url) links restricted to http/https/mailto. Pure — no React, no
// DOM — so both frontends render the same AST and the parsing is unit-testable. Each app
// owns a small renderer that maps this AST to its own themed React.

export type MdInline =
  | { type: "text"; text: string }
  | { type: "strong"; text: string }
  | { type: "em"; text: string }
  | { type: "link"; text: string; href: string };

export type MdBlock =
  | { type: "paragraph"; lines: MdInline[][] }
  | { type: "list"; items: MdInline[][] };

const SAFE_LINK = /^(https?:\/\/|mailto:)/i;

// Only allow schemes that can't run script, so a note can't smuggle in javascript: URLs.
export function safeHref(raw: string): string | null {
  const href = raw.trim();
  return SAFE_LINK.test(href) ? href : null;
}

export function parseInline(src: string): MdInline[] {
  const out: MdInline[] = [];
  let buf = "";
  let i = 0;
  const flush = () => {
    if (buf) {
      out.push({ type: "text", text: buf });
      buf = "";
    }
  };
  while (i < src.length) {
    const rest = src.slice(i);
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(rest);
    if (link && link[1] !== undefined && link[2] !== undefined) {
      const whole = link[0];
      const href = safeHref(link[2]);
      flush();
      if (href) out.push({ type: "link", text: link[1], href });
      else out.push({ type: "text", text: whole }); // unsafe scheme: show literally
      i += whole.length;
      continue;
    }
    if (rest.startsWith("**")) {
      const end = src.indexOf("**", i + 2);
      if (end !== -1 && end > i + 2) {
        flush();
        out.push({ type: "strong", text: src.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    if (src[i] === "*") {
      const end = src.indexOf("*", i + 1);
      if (end !== -1 && end > i + 1) {
        flush();
        out.push({ type: "em", text: src.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    buf += src[i];
    i += 1;
  }
  flush();
  return out;
}

const BULLET = /^\s*[-*]\s+/;

export function parseMarkdown(src: string): MdBlock[] {
  const lines = (src ?? "").replace(/\r\n?/g, "\n").split("\n");
  const blocks: MdBlock[] = [];
  let para: MdInline[][] = [];
  let list: MdInline[][] = [];
  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: "paragraph", lines: para });
      para = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      blocks.push({ type: "list", items: list });
      list = [];
    }
  };
  for (const line of lines) {
    if (BULLET.test(line)) {
      flushPara();
      list.push(parseInline(line.replace(BULLET, "")));
      continue;
    }
    flushList();
    if (line.trim() === "") {
      flushPara();
      continue;
    }
    para.push(parseInline(line));
  }
  flushPara();
  flushList();
  return blocks;
}
