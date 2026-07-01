// Fullscreen reminder/timer takeover (FR-REM-4). Shown on a reminder.fired or timer.fired
// message, auto dismissing after a few seconds, with an optional chime. The kiosk Chromium
// is launched with --autoplay-policy=no-user-gesture-required so the chime plays unattended.
import { useEffect } from "react";
import { hexA } from "./theme";

const DISMISS_MS = 8000;

// A short sine-wave chime synthesized with the Web Audio API (no asset needed).
function playChime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
    osc.start();
    osc.stop(ctx.currentTime + 1.2);
  } catch {
    // audio unavailable; show the overlay silently
  }
}

export interface TakeoverContent {
  title: string;
  chime: boolean;
}

export function Takeover({ content, onDismiss }: { content: TakeoverContent; onDismiss: () => void }) {
  useEffect(() => {
    if (content.chime) playChime();
    const t = setTimeout(onDismiss, DISMISS_MS);
    return () => clearTimeout(t);
  }, [content, onDismiss]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: hexA("#0c0910", 0.92),
        backdropFilter: "blur(6px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        color: "#fff",
        animation: "fadeIn .25s ease",
      }}
    >
      <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: ".12em", color: "#FF9A9A", marginBottom: 16 }}>
        Reminder
      </div>
      <div style={{ fontSize: 48, fontWeight: 700, textAlign: "center", padding: "0 40px" }}>{content.title}</div>
    </div>
  );
}
