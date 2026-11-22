"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Props = {
  workItemId?: string;
  processId?: string;
  /** Watch while true (background work queued, build/validate in progress). */
  active: boolean;
  /** Activity stamp the server rendered with; any newer write triggers refresh. */
  stamp: string;
  intervalMs?: number;
};

/**
 * Refreshes server components when the worker records progress. Read-only:
 * closing the tab no longer stalls any work.
 */
export function LiveRefresh({
  workItemId,
  processId,
  active,
  stamp: renderedStamp,
  intervalMs = 3000,
}: Props) {
  const router = useRouter();
  const lastStamp = useRef(renderedStamp);
  const inFlight = useRef(false);

  useEffect(() => {
    lastStamp.current = renderedStamp;
  }, [renderedStamp]);

  useEffect(() => {
    if (!active) return;
    const query = workItemId
      ? `itemId=${encodeURIComponent(workItemId)}`
      : processId
        ? `processId=${encodeURIComponent(processId)}`
        : null;
    if (!query) return;

    let cancelled = false;
    async function tick() {
      if (cancelled || inFlight.current || document.hidden) return;
      inFlight.current = true;
      try {
        const res = await fetch(`/api/work/activity?${query}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { stamp?: string };
        const stamp = data.stamp ?? "";
        if (stamp !== lastStamp.current) {
          lastStamp.current = stamp;
          router.refresh();
        }
      } catch {
        // ignore transient errors
      } finally {
        inFlight.current = false;
      }
    }

    void tick();
    const id = window.setInterval(() => void tick(), intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [active, workItemId, processId, intervalMs, router]);

  return null;
}
