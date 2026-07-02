// Renders a note's basic markdown (FR-NOTE-3). Parsing is shared and pure
// (@dayboard/shared/markdown); this component only maps the AST to admin-themed React.
// Duplicated in apps/display with its own theme, matching the app-boundary convention.
import type { CSSProperties, ReactNode } from "react";
import { parseMarkdown, type MdInline } from "@dayboard/shared/markdown";
import { colors } from "./theme";

function inline(nodes: MdInline[]): ReactNode[] {
  return nodes.map((n, i) => {
    if (n.type === "strong") return <strong key={i}>{n.text}</strong>;
    if (n.type === "em") return <em key={i}>{n.text}</em>;
    if (n.type === "link")
      return (
        <a key={i} href={n.href} target="_blank" rel="noreferrer" style={{ color: colors.accentSoft }}>
          {n.text}
        </a>
      );
    return <span key={i}>{n.text}</span>;
  });
}

export function Markdown({ source, style }: { source: string; style?: CSSProperties }) {
  const blocks = parseMarkdown(source);
  return (
    <div style={style}>
      {blocks.map((b, bi) =>
        b.type === "list" ? (
          <ul key={bi} style={{ margin: bi === 0 ? "0" : "6px 0 0", paddingLeft: 18 }}>
            {b.items.map((item, ii) => (
              <li key={ii}>{inline(item)}</li>
            ))}
          </ul>
        ) : (
          <p key={bi} style={{ margin: bi === 0 ? "0" : "8px 0 0" }}>
            {b.lines.map((line, li) => (
              <span key={li}>
                {li > 0 && <br />}
                {inline(line)}
              </span>
            ))}
          </p>
        ),
      )}
    </div>
  );
}
