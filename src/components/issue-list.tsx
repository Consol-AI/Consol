"use client";

import Link from "next/link";
import { LiveDot } from "@/components/live-dot";
import { Bot, ShieldCheck, Terminal, GitBranch } from "lucide-react";
import { CreateIssueForm } from "@/components/create-issue-form";
import { Badge } from "@/components/ui/badge";
import {
  ATTENTION_LABELS,
  ATTENTION_ORDER,
  attentionCounts,
  groupIssuesByAttention,
  type AttentionBucket,
} from "@/lib/issues/attention";
import {
  formatRelativeTime,
  stageMeta,
} from "@/lib/issues/stage-meta";
import type { Stage, WorkItem } from "@/lib/factory";
import { cn } from "@/lib/utils";

type Props = {
  productId: string;
  processId: string;
  stages: Stage[];
  items: WorkItem[];
  entryStageId: string;
};

function actorIcon(type: string) {
  if (type === "agent") return Bot;
  if (type === "human") return ShieldCheck;
  if (type === "script") return Terminal;
  return GitBranch;
}

export function IssueList({
  productId,
  processId,
  stages,
  items,
  entryStageId,
}: Props) {
  const stageById = new Map(stages.map((s) => [s.id, s]));
  const groups = groupIssuesByAttention(items, stages);
  const counts = attentionCounts(items, stages);
  const openBuckets = ATTENTION_ORDER.filter(
    (bucket) => bucket !== "done" && counts[bucket] > 0,
  );
  const summary = [
    counts.needs_you ? `${counts.needs_you} need you` : null,
    counts.agents_working ? `${counts.agents_working} agents working` : null,
    counts.waiting ? `${counts.waiting} waiting` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-4">
      <CreateIssueForm processId={processId} entryStageId={entryStageId} />

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--console-line)] bg-[var(--console-surface)] px-6 py-16 text-center shadow-[var(--console-shadow)]">
          <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-[var(--console-accent-soft)] text-[var(--console-accent)]">
            <GitBranch className="size-4" />
          </div>
          <p className="text-[15px] font-semibold tracking-tight text-[var(--console-ink)]">
            No issues yet
          </p>
          <p className="mt-1 max-w-sm text-[13px] text-[var(--console-muted)]">
            Create the first issue. The list groups work by who needs attention —
            you, an agent, or a waiting stage — instead of spreading cards across
            columns.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {summary ? (
              <p className="text-[13px] text-[var(--console-muted)]">{summary}</p>
            ) : (
              <p className="text-[13px] text-[var(--console-muted)]">
                All caught up
              </p>
            )}
            <div className="ml-auto flex flex-wrap gap-1.5">
              {ATTENTION_ORDER.map((bucket) => (
                <Badge
                  key={bucket}
                  variant="outline"
                  className={cn(
                    "h-6 border-[var(--console-line)] bg-[var(--console-panel)] px-2 text-[11px] text-[var(--console-muted)]",
                    counts[bucket] > 0 &&
                      bucket === "needs_you" &&
                      "border-transparent bg-amber-50 text-amber-800",
                    counts[bucket] > 0 &&
                      bucket === "agents_working" &&
                      "border-transparent bg-[var(--console-accent-soft)] text-[var(--console-accent)]",
                  )}
                >
                  {bucket === "agents_working" && counts[bucket] > 0 ? (
                    <LiveDot className="mr-0.5" />
                  ) : null}
                  {ATTENTION_LABELS[bucket]} · {counts[bucket]}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {(openBuckets.length > 0
              ? openBuckets
              : (["done"] as AttentionBucket[])
            ).map((bucket) => {
              const bucketItems = groups[bucket];
              if (bucketItems.length === 0) return null;
              return (
                <section key={bucket} className="space-y-2">
                  <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--console-faint)]">
                    {bucket === "needs_you"
                      ? "Needs your attention"
                      : ATTENTION_LABELS[bucket]}
                  </h2>
                  <ul className="space-y-2">
                    {bucketItems.map((item) => {
                      const stage = stageById.get(item.stage_id);
                      const meta = stageMeta(stage?.stage_type ?? "legacy");
                      const Icon = actorIcon(stage?.stage_type ?? "legacy");
                      return (
                        <li key={item.id}>
                          <Link
                            href={`/app/products/${productId}/processes/${processId}?item=${item.id}`}
                            className="group flex items-start gap-3 rounded-xl bg-[var(--console-surface)] p-4 shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)] transition hover:ring-[var(--console-accent)]/35"
                          >
                            <div
                              className={cn(
                                "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                                meta.badgeClass,
                              )}
                            >
                              <Icon className="size-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <p className="text-[14px] font-semibold tracking-tight text-[var(--console-ink)] transition group-hover:text-[var(--console-accent)]">
                                  {item.title}
                                </p>
                                <span className="text-[11px] tabular-nums text-[var(--console-faint)]">
                                  {formatRelativeTime(item.updated_at)}
                                </span>
                              </div>
                              {item.body ? (
                                <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-[var(--console-muted)]">
                                  {item.body}
                                </p>
                              ) : null}
                              <div className="mt-2.5 flex flex-wrap gap-1.5">
                                {stage ? (
                                  <Badge
                                    variant="outline"
                                    className="h-5 border-[var(--console-line)] bg-[var(--console-panel)] px-1.5 text-[10px] text-[var(--console-muted)]"
                                  >
                                    {stage.name}
                                  </Badge>
                                ) : null}
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "h-5 gap-1 px-1.5 text-[10px]",
                                    meta.badgeClass,
                                  )}
                                >
                                  <Icon className="size-3" />
                                  {meta.label}
                                </Badge>
                              </div>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}

            {openBuckets.length > 0 && groups.done.length > 0 ? (
              <section className="space-y-2">
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--console-faint)]">
                  Done
                </h2>
                <ul className="space-y-2">
                  {groups.done.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/app/products/${productId}/processes/${processId}?item=${item.id}`}
                        className="flex items-center justify-between gap-3 rounded-xl bg-[var(--console-surface)] px-4 py-3 text-[13px] text-[var(--console-muted)] ring-1 ring-[var(--console-line)] transition hover:text-[var(--console-ink)] hover:ring-[var(--console-accent)]/30"
                      >
                        <span className="truncate font-medium">{item.title}</span>
                        <span className="shrink-0 text-[11px] tabular-nums text-[var(--console-faint)]">
                          {formatRelativeTime(item.updated_at)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
