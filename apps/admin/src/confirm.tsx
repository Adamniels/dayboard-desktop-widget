// A promise-based delete confirmation dialog (FR-EVT-4 / FR-PROJ-2 / FR-TODO-3 / FR-NOTE-2).
// useConfirmDelete() returns { dialog, confirmDelete }: render {dialog} once in the component,
// then `if (await confirmDelete(kind, label)) …` guards any destructive action. No context or
// App-root wiring needed; the wording lives in confirm-model.ts (unit-tested).
import { useCallback, useState } from "react";
import { deleteConfirmCopy, type ConfirmKind } from "./confirm-model";
import { colors, hexA } from "./theme";
import { DangerButton, GhostButton } from "./ui";

type Pending = { kind: ConfirmKind; label?: string | null; resolve: (ok: boolean) => void };

export function useConfirmDelete() {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirmDelete = useCallback(
    (kind: ConfirmKind, label?: string | null) =>
      new Promise<boolean>((resolve) => setPending({ kind, label, resolve })),
    [],
  );

  const settle = (ok: boolean) => {
    setPending((p) => {
      p?.resolve(ok);
      return null;
    });
  };

  const dialog = pending ? (
    <ConfirmDialog
      copy={deleteConfirmCopy(pending.kind, pending.label)}
      onCancel={() => settle(false)}
      onConfirm={() => settle(true)}
    />
  ) : null;

  return { dialog, confirmDelete };
}

function ConfirmDialog({
  copy,
  onCancel,
  onConfirm,
}: {
  copy: { title: string; body: string; confirmLabel: string };
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(4,4,8,.6)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        animation: "dbPop .15s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 380,
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
          padding: 22,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          boxShadow: `0 20px 60px ${hexA("#000000", 0.5)}`,
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 600, color: colors.text }}>{copy.title}</span>
        <span style={{ fontSize: 13.5, lineHeight: 1.5, color: colors.textMuted }}>{copy.body}</span>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 6 }}>
          <GhostButton onClick={onCancel} autoFocus>
            Cancel
          </GhostButton>
          <DangerButton onClick={onConfirm}>{copy.confirmLabel}</DangerButton>
        </div>
      </div>
    </div>
  );
}
