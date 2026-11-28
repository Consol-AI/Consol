"use client";

import { useSyncExternalStore } from "react";

// One shared 1s clock for live elapsed timers; null during SSR/hydration.
let clockListeners = new Set<() => void>();
let clockTimer: number | null = null;
function subscribeClock(listener: () => void) {
  clockListeners.add(listener);
  if (clockTimer === null) {
    clockTimer = window.setInterval(() => clockListeners.forEach((l) => l()), 1000);
  }
  return () => {
    clockListeners.delete(listener);
    if (clockListeners.size === 0 && clockTimer !== null) {
      window.clearInterval(clockTimer);
      clockTimer = null;
      clockListeners = new Set();
    }
  };
}

export function useNow(): number | null {
  return useSyncExternalStore(
    subscribeClock,
    () => Math.floor(Date.now() / 1000) * 1000,
    () => null,
  );
}

export function Elapsed({ since }: { since: string }) {
  const now = useNow();
  const start = new Date(since).getTime();
  if (now === null || Number.isNaN(start)) return null;
  const seconds = Math.max(0, Math.floor((now - start) / 1000));
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return (
    <span className="tabular-nums">
      {m > 0 ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`}
    </span>
  );
}
