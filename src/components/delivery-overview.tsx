import Link from "next/link";
import { Bot, CheckCircle2, Circle, GitPullRequest, Loader2 } from "lucide-react";
import type { AgentRun } from "@/lib/integrations/agent-runs";
import type { Stage, StageRunEvent, WorkItem } from "@/lib/factory";
import type { WorkItemExternalLink } from "@/lib/integrations/types";
import { cn } from "@/lib/utils";

type ItemRow = {
  item: WorkItem;
  stage: Stage | null;
  latestEvent?: StageRunEvent;
  agentRun?: AgentRun | null;
  prLink?: WorkItemExternalLink | null;
};

type Props = {
  productId: string;
  processId: string;
  stages: Stage[];
  rows: ItemRow[];
};

function statusLabel(row: ItemRow): string {
  if (row.item.status === "done") return "Done";
  if (row.agentRun && ["CREATING", "RUNNING", "PENDING", "WAITING_FOR_BACKGROUND_WORK"].includes(row.agentRun.status.toUpperCase())) {
    return `Cursor ${row.agentRun.status}`;
  }
  return row.stage?.name ?? "Unknown";
}

export function DeliveryOverview({ productId, processId, stages, rows }: Props) {
  const ordered = [...stages].sort((a, b) => a.position - b.position);

  return (
    <section className="overflow-hidden rounded-xl bg-[var(--console-surface)] shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)]">
      <header className="border-b border-[var(--console-line)] px-4 py-3">
        <h2 className="text-[13px] font-semibold text-[var(--console-ink)]">
          Delivery overview
        </h2>
        <p className="mt-0.5 text-[12px] text-[var(--console-muted)]">
          Track software delivery from spec through merge.
        </p>
        <ol className="mt-3 flex flex-wrap gap-1.5">
          {ordered.map((stage) => (
            <li
              key={stage.id}
              className="rounded-md bg-[var(--console-panel)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--console-faint)]"
            >
              {stage.name}
            </li>
          ))}
        </ol>
      </header>

      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-[12px] text-[var(--console-muted)]">
          No delivery work items yet. Start one from Home chat.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--console-line)]">
          {rows.map((row) => {
            const active =
              row.agentRun &&
              ["CREATING", "RUNNING", "PENDING", "WAITING_FOR_BACKGROUND_WORK"].includes(
                row.agentRun.status.toUpperCase(),
              );
            return (
              <li key={row.item.id}>
                <Link
                  href={`/app/products/${productId}/processes/${processId}?item=${row.item.id}`}
                  className="flex items-start gap-3 px-4 py-3 transition hover:bg-[var(--console-hover)]"
                >
                  <span className="mt-0.5 text-[var(--console-muted)]">
                    {row.item.status === "done" ? (
                      <CheckCircle2 className="size-4 text-emerald-600" />
                    ) : active ? (
                      <Loader2 className="size-4 animate-spin text-[var(--console-accent)]" />
                    ) : row.stage?.stage_type === "human" ? (
                      <Circle className="size-4 text-[var(--console-accent)]" />
                    ) : (
                      <Bot className="size-4" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-[var(--console-ink)]">
                      {row.item.title}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-[var(--console-muted)]">
                      <span>{statusLabel(row)}</span>
                      {row.latestEvent?.summary ? (
                        <span className="truncate text-[var(--console-faint)]">
                          · {row.latestEvent.summary}
                        </span>
                      ) : null}
                    </span>
                    {row.prLink ? (
                      <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-[var(--console-accent)]">
                        <GitPullRequest className="size-3" />
                        PR #{row.prLink.external_id || "…"}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                      row.item.status === "done"
                        ? "bg-emerald-50 text-emerald-700"
                        : row.stage?.stage_type === "human"
                          ? "bg-[var(--console-accent-soft)] text-[var(--console-accent)]"
                          : "bg-[var(--console-panel)] text-[var(--console-muted)]",
                    )}
                  >
                    {row.item.status === "done"
                      ? "Done"
                      : row.stage?.stage_type === "human"
                        ? "Needs you"
                        : active
                          ? "Building"
                          : "In flow"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
