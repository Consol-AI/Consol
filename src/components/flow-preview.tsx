"use client";

import { ArrowRight, CornerDownLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { normalizeTransitions, type FlowDefinition } from "@/lib/flows";
import { stageMeta } from "@/lib/issues/stage-meta";
import { cn } from "@/lib/utils";

export function FlowPreview({ flow }: { flow: FlowDefinition }) {
  const stageById = new Map(flow.stages.map((stage) => [stage.id, stage]));

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto pb-1">
        <ol className="flex min-w-min gap-2">
          {flow.stages.map((stage, index) => {
            const meta = stageMeta(stage.type);
            const Icon = meta.icon;
            const isEntry = stage.id === flow.entry;
            return (
              <li key={stage.id} className="flex items-center gap-2">
                <div
                  className={cn(
                    "animate-rise relative w-[11.5rem] shrink-0 overflow-hidden rounded-xl bg-[var(--console-surface)] p-3 shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)]",
                    isEntry && "ring-[var(--console-accent)]",
                  )}
                  style={{ animationDelay: `${index * 45}ms` }}
                >
                  <div
                    className={cn(
                      "absolute inset-y-3 left-0 w-0.5 rounded-full",
                      meta.railClass,
                    )}
                  />
                  <div className="pl-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-5 gap-1 px-1.5 text-[10px]",
                          meta.badgeClass,
                        )}
                      >
                        <Icon className="size-3" aria-hidden />
                        {meta.label}
                      </Badge>
                      {isEntry ? (
                        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--console-accent)]">
                          Entry
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-[13px] font-semibold tracking-tight text-[var(--console-ink)]">
                      {stage.name}
                    </p>
                    {stage.description ? (
                      <p className="mt-1 line-clamp-3 text-[11px] leading-snug text-[var(--console-muted)]">
                        {stage.description}
                      </p>
                    ) : null}
                  </div>
                </div>
                {index < flow.stages.length - 1 ? (
                  <ArrowRight
                    className="size-3.5 shrink-0 text-[var(--console-faint)]"
                    aria-hidden
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>

      <section className="animate-rise-delay overflow-hidden rounded-xl bg-[var(--console-surface)] shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)]">
        <div className="border-b border-[var(--console-line)] px-4 py-3">
          <h2 className="text-[13px] font-semibold text-[var(--console-ink)]">
            Stages
          </h2>
          <p className="mt-0.5 text-[12px] text-[var(--console-muted)]">
            Typed steps and who or what advances them.
          </p>
        </div>
        <ul className="divide-y divide-[var(--console-line)]">
          {flow.stages.map((stage) => {
            const meta = stageMeta(stage.type);
            const Icon = meta.icon;
            return (
              <li key={stage.id} className="px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[13px] font-medium text-[var(--console-ink)]">
                        {stage.name}
                      </h3>
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-5 gap-1 px-1.5 text-[10px]",
                          meta.badgeClass,
                        )}
                      >
                        <Icon className="size-3" aria-hidden />
                        {meta.label}
                      </Badge>
                      <span className="font-mono text-[11px] text-[var(--console-faint)]">
                        {stage.id}
                      </span>
                    </div>
                    {stage.description ? (
                      <p className="mt-1 max-w-2xl text-[12px] text-[var(--console-muted)]">
                        {stage.description}
                      </p>
                    ) : null}
                    {stage.type === "human" ? (
                      <p className="mt-2 text-[12px] text-[var(--console-faint)]">
                        <span className="font-medium text-[var(--console-muted)]">
                          {stage.responsible}
                        </span>
                        {" · "}
                        {stage.approves}
                      </p>
                    ) : null}
                    {stage.type === "agent" ? (
                      <p className="mt-2 text-[12px] text-[var(--console-faint)]">
                        Agent{" "}
                        <span className="font-mono text-[var(--console-muted)]">
                          {stage.agentKey ?? "forge"}
                        </span>
                        {stage.allowedTools.length > 0 ? (
                          <>
                            {" · "}
                            {stage.allowedTools.join(", ")}
                          </>
                        ) : null}
                      </p>
                    ) : null}
                    {stage.type === "script" ? (
                      <p className="mt-2 text-[12px] text-[var(--console-faint)]">
                        Script{" "}
                        <span className="font-mono text-[var(--console-muted)]">
                          {stage.path ?? stage.inline ?? "inline"}
                        </span>
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="overflow-hidden rounded-xl bg-[var(--console-surface)] shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)]">
        <div className="border-b border-[var(--console-line)] px-4 py-3">
          <h2 className="text-[13px] font-semibold text-[var(--console-ink)]">
            Transitions
          </h2>
          <p className="mt-0.5 text-[12px] text-[var(--console-muted)]">
            Outcomes that move work between stages, including loops.
          </p>
        </div>
        <ul className="divide-y divide-[var(--console-line)]">
          {flow.stages.map((stage) => {
            const edges = normalizeTransitions(flow.transitions, stage.id);
            if (edges.length === 0) return null;
            return (
              <li key={stage.id} className="px-4 py-3.5">
                <p className="text-[12px] font-medium text-[var(--console-ink)]">
                  {stage.name}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {edges.map((edge) => {
                    const target =
                      edge.next === "done"
                        ? null
                        : stageById.get(edge.next);
                    const loopsBack =
                      target != null &&
                      flow.stages.findIndex((s) => s.id === stage.id) >
                        flow.stages.findIndex((s) => s.id === edge.next);
                    return (
                      <li
                        key={`${stage.id}-${edge.when}-${edge.next}`}
                        className="flex flex-wrap items-center gap-2 text-[12px] text-[var(--console-muted)]"
                      >
                        <span className="rounded-md bg-[var(--console-panel)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--console-ink)]">
                          {edge.when}
                        </span>
                        {loopsBack ? (
                          <CornerDownLeft
                            className="size-3.5 text-[var(--console-faint)]"
                            aria-hidden
                          />
                        ) : (
                          <ArrowRight
                            className="size-3.5 text-[var(--console-faint)]"
                            aria-hidden
                          />
                        )}
                        <span className="font-medium text-[var(--console-ink)]">
                          {edge.next === "done"
                            ? "Done"
                            : (target?.name ?? edge.next)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
