"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Square, Trash2 } from "lucide-react";
import {
  deleteWorkItemAction,
  stopWorkItemAction,
  type FlowControlResult,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  itemId: string;
  /** Work item status: open | done | stopped. */
  status: string;
  /** Where to go after a delete (the current view no longer exists). */
  afterDeleteHref?: string;
  /** Icon-only buttons for dense list rows. */
  compact?: boolean;
  /** Report the outcome to the host (detail view shows a banner). */
  onResult?: (result: { notice?: string; error?: string }) => void;
};

export function FlowControls({
  itemId,
  status,
  afterDeleteHref,
  compact = false,
  onResult,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"stop" | "delete" | null>(null);
  const canStop = status !== "done" && status !== "stopped";

  function run(
    kind: "stop" | "delete",
    action: (formData: FormData) => Promise<FlowControlResult>,
  ) {
    const question =
      kind === "stop"
        ? "Stop this flow? Running agents and queued work will be cancelled."
        : "Delete this flow? Running work is stopped first. This cannot be undone.";
    if (!window.confirm(question)) return;
    const formData = new FormData();
    formData.set("itemId", itemId);
    setBusy(kind);
    startTransition(async () => {
      try {
        const result = await action(formData);
        const warnings = result.warnings?.length
          ? ` ${result.warnings.join(" ")}`
          : "";
        onResult?.({ notice: `${result.summary}${warnings}` });
        if (kind === "delete" && afterDeleteHref) {
          router.push(afterDeleteHref);
        } else {
          router.refresh();
        }
      } catch (err) {
        const error =
          err instanceof Error ? err.message : `Could not ${kind} this flow.`;
        if (onResult) onResult({ error });
        else window.alert(error);
      } finally {
        setBusy(null);
      }
    });
  }

  const quiet =
    "border-[var(--console-line)] bg-white text-[12px] text-[var(--console-muted)] hover:bg-[var(--console-hover)]";

  return (
    <div className="flex items-center gap-1.5">
      {canStop ? (
        <Button
          type="button"
          variant="outline"
          size={compact ? "icon-sm" : "sm"}
          disabled={pending}
          onClick={() => run("stop", stopWorkItemAction)}
          aria-label="Stop flow"
          title="Stop flow"
          className={cn(quiet, !compact && "h-8 gap-1.5")}
        >
          {busy === "stop" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Square className="size-3.5" />
          )}
          {compact ? null : busy === "stop" ? "Stopping…" : "Stop"}
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size={compact ? "icon-sm" : "sm"}
        disabled={pending}
        onClick={() => run("delete", deleteWorkItemAction)}
        aria-label="Delete flow"
        title="Delete flow"
        className={cn(
          quiet,
          "hover:border-red-200 hover:text-red-700",
          !compact && "h-8 gap-1.5",
        )}
      >
        {busy === "delete" ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Trash2 className="size-3.5" />
        )}
        {compact ? null : busy === "delete" ? "Deleting…" : "Delete"}
      </Button>
    </div>
  );
}
