"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Props = {
  workItemId?: string;
  organizationId?: string;
  /** Poll while true (e.g. item is on build/validate). */
  active: boolean;
  intervalMs?: number;
};

/** Client-side poller for Cursor agent runs / pending validate stages. */
export function DeliveryPoller({
  workItemId,
  organizationId,
  active,
  intervalMs = 5000,
}: Props) {
  const router = useRouter();
  const inFlight = useRef(false);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    async function tick() {
      if (cancelled || inFlight.current) return;
      inFlight.current = true;
      try {
        const res = await fetch("/api/integrations/cursor/poll", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            workItemId
              ? { workItemId }
              : { organizationId },
          ),
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          results?: Array<{ changed?: boolean; advanced?: boolean }>;
        };
        const changed = (data.results ?? []).some(
          (r) => r.changed || r.advanced,
        );
        if (changed) router.refresh();
      } catch {
        // ignore transient poll errors
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
  }, [active, workItemId, organizationId, intervalMs, router]);

  return null;
}
