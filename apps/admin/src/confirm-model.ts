// Pure copy-builder for the delete confirmation dialog (FR-EVT-4 / FR-PROJ-2 / FR-TODO-3 /
// FR-NOTE-2). Kept free of React/DOM so the wording is unit-testable without a component
// render; confirm.tsx wires this into the actual dialog.

export type ConfirmKind = "event" | "project" | "todo" | "note";

export interface ConfirmCopy {
  title: string;
  body: string;
  confirmLabel: string;
}

const NOUN: Record<ConfirmKind, string> = {
  event: "event",
  project: "project",
  todo: "to-do",
  note: "note",
};

// A short, human name for the thing being deleted, trimmed and length-capped so a long
// title can't blow out the dialog. Falls back to the generic noun when there's no label.
export function describeTarget(kind: ConfirmKind, label: string | null | undefined): string {
  const clean = (label ?? "").trim();
  if (!clean) return `this ${NOUN[kind]}`;
  const short = clean.length > 60 ? `${clean.slice(0, 57)}…` : clean;
  return `"${short}"`;
}

export function deleteConfirmCopy(kind: ConfirmKind, label?: string | null): ConfirmCopy {
  const target = describeTarget(kind, label);
  const title = `Delete ${NOUN[kind]}?`;
  const tail =
    kind === "project"
      ? "This also removes its to-dos and can't be undone."
      : "This can't be undone.";
  return { title, body: `Delete ${target}. ${tail}`, confirmLabel: "Delete" };
}
