"use client";

import Link from "next/link";
import { CheckCircle2, GitBranch } from "lucide-react";
import { CreateIssueForm } from "@/components/create-issue-form";
import { Badge } from "@/components/ui/badge";
import { parseStageConfig } from "@/lib/flows/stage-config";
import { stageMeta } from "@/lib/issues/stage-meta";
import type { Stage, WorkItem } from "@/lib/factory";
import { cn } from "@/lib/utils";

type Props = {
  productId: string;
  processId: string;
  stages: Stage[];
  items: WorkItem[];
  entryStageId: string;
};

export function ProcessBoard({
  productId,
  processId,
  stages,
  items,
  entryStageId,
}: Props) {
  return (
    <div className="space-y-4">
      <CreateIssueForm processId={processId} entryStageId={entryStageId} />

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--console-line)] bg-[var(--console-surface)] px-6 py-16 text-center shadow-[var(--console-shadow)]">
          <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-[var(--console-accent-soft)] text-[var(--console-accent)]">
            <GitBranch className="size-4" />
          </div>
          <p className="text-[15px] font-semibold tracking-tight text-[var(--console-ink)]">
            Empty board
          </p>
          <p className="mt-1 max-w-sm text-[13px] text-[var(--console-muted)]">
            Add an issue to see it across stages. Open an issue to advance the
            process — actions live on the issue, not on cards.
          </p>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {stages.map((stage, index) => {
            const columnItems = items.filter((i) => i.stage_id === stage.id);
            const config = parseStageConfig(stage.config);
            const meta = stageMeta(stage.stage_type);
            const Icon = meta.icon;
            return (
              <section
                key={stage.id}
                className="animate-rise flex min-w-[17.5rem] flex-1 flex-col overflow-hidden rounded-xl bg-[var(--console-surface)] shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)]"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <header className="relative border-b border-[var(--console-line)] px-3.5 py-3">
                  <div
                    className={cn(
                      "absolute inset-y-3 left-0 w-0.5 rounded-full",
                      meta.railClass,
                    )}
                  />
                  <div className="flex items-start justify-between gap-2 pl-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-[13px] font-semibold tracking-tight text-[var(--console-ink)]">
                          {stage.name}
                        </h3>
                        <span className="rounded-md bg-[var(--console-panel)] px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-[var(--console-muted)]">
                          {columnItems.length}
                        </span>
                      </div>
                      {stage.description ? (
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[var(--console-muted)]">
                          {stage.description}
                        </p>
                      ) : null}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-5 shrink-0 gap-1 px-1.5 text-[10px]",
                        meta.badgeClass,
                      )}
                    >
                      <Icon className="size-3" />
                      {meta.label}
                    </Badge>
                  </div>
                  {stage.stage_type === "human" ? (
                    <p className="mt-2 pl-2 text-[11px] text-[var(--console-faint)]">
                      <span className="font-medium text-[var(--console-muted)]">
                        {String(config.responsible ?? "Owner")}
                      </span>
                      {" · "}
                      {String(config.approves ?? "Approve to continue")}
                    </p>
                  ) : null}
                </header>

                <div className="flex flex-1 flex-col gap-2 bg-[var(--console-panel)]/50 p-2.5">
                  {columnItems.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[var(--console-line)] bg-white/60 px-3 py-6 text-center text-[11px] text-[var(--console-faint)]">
                      No issues here
                    </div>
                  ) : (
                    columnItems.map((item) => {
                      const done = item.status === "done";
                      return (
                        <Link
                          key={item.id}
                          href={`/app/products/${productId}/processes/${processId}?item=${item.id}&view=board`}
                          className="group rounded-lg bg-white p-3 shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)] transition hover:ring-[var(--console-accent)]/30"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[13px] font-medium leading-snug text-[var(--console-ink)] transition group-hover:text-[var(--console-accent)]">
                              {item.title}
                            </p>
                            {done ? (
                              <Badge
                                variant="outline"
                                className="h-5 shrink-0 gap-1 border-transparent bg-emerald-50 px-1.5 text-[10px] text-emerald-700"
                              >
                                <CheckCircle2 className="size-3" />
                                Done
                              </Badge>
                            ) : null}
                          </div>
                          {item.body ? (
                            <p className="mt-1.5 line-clamp-3 text-[12px] leading-relaxed text-[var(--console-muted)]">
                              {item.body}
                            </p>
                          ) : null}
                        </Link>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
