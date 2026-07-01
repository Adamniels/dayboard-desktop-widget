// Keeps a full-day grid scrolled so the now line stays centered, clamped to the day edges
// (the pure math is nowScrollTop in view.ts). Runs after each render, so it re-centers on the
// minute tick and on orientation changes, reading the live viewport height.
import { useLayoutEffect } from "react";
import { nowScrollTop } from "./view";

export function useNowScroll(
  ref: React.RefObject<HTMLDivElement | null>,
  nowMinutes: number,
  hourPx: number,
): void {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = nowScrollTop(nowMinutes, hourPx, el.clientHeight).scrollTop;
  });
}
