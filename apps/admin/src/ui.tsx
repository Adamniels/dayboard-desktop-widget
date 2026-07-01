// Shared styled primitives for the admin control room, so each tab reads consistently and the
// dark prototype look lives in one place.
import type { CSSProperties, ReactNode } from "react";
import { colors } from "./theme";

export const card: CSSProperties = {
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 16,
  padding: 18,
};

export function PageHeading({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
      <div>
        <h1 style={{ fontSize: 23, fontWeight: 600, letterSpacing: "-.02em", margin: 0 }}>{title}</h1>
        <p style={{ margin: "5px 0 0", fontSize: 13.5, color: colors.textDim, maxWidth: 560, lineHeight: 1.45 }}>{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label style={{ fontSize: 11.5, color: colors.textDim, fontWeight: 500 }}>{children}</label>;
}

const fieldBase: CSSProperties = {
  height: 40,
  padding: "0 13px",
  borderRadius: 10,
  border: `1px solid ${colors.borderInput}`,
  background: colors.inputBg,
  color: "#fff",
  fontSize: 14,
  outline: "none",
};

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...fieldBase, width: "100%", ...(props.style as CSSProperties) }} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ ...fieldBase, width: "100%", padding: "0 11px", ...(props.style as CSSProperties) }} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{ ...fieldBase, height: "auto", minHeight: 64, padding: "12px 13px", width: "100%", resize: "vertical", lineHeight: 1.5, fontFamily: "inherit", ...(props.style as CSSProperties) }}
    />
  );
}

export function PrimaryButton({ children, style, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      style={{ height: 40, padding: "0 16px", borderRadius: 11, border: "none", background: colors.accent, color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer", boxShadow: `0 4px 14px ${colors.accent}55`, ...style }}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, style, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      style={{ height: 40, padding: "0 15px", borderRadius: 10, border: `1px solid ${colors.borderInput}`, background: colors.surfaceUp, color: "rgba(255,255,255,.85)", fontWeight: 600, fontSize: 13.5, cursor: "pointer", ...style }}
    >
      {children}
    </button>
  );
}

export function DangerButton({ children, style, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      style={{ height: 40, padding: "0 16px", borderRadius: 11, border: `1px solid ${colors.red}4d`, background: `${colors.red}1a`, color: colors.redText, fontWeight: 600, fontSize: 14, cursor: "pointer", ...style }}
    >
      {children}
    </button>
  );
}
