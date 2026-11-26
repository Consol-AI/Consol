import Link from "next/link";
import { GitBranch } from "lucide-react";
import type { FlowDefinition } from "@/lib/flows";
import { stageMeta } from "@/lib/issues/stage-meta";
import { cn } from "@/lib/utils";

export function FlowCatalog({ flows }: { flows: FlowDefinition[] }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="px-5 py-5 md:px-8 md:py-6">
        <div className="animate-rise min-w-0">
          <p className="text-[12px] text-[var(--console-faint)]">Templates</p>
          <h1 className="mt-0.5 text-[22px] font-semibold tracking-tight text-[var(--console-ink)]">
            Flows
          </h1>
          <p className="mt-1 max-w-xl text-[13px] text-[var(--console-muted)]">
            Preview process templates — stages, owners, inputs, and
            transitions. Start one from Work.
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-5 pb-8 md:px-8">
        <div className="animate-rise-delay mx-auto max-w-[720px] overflow-hidden rounded-xl bg-[var(--console-surface)] shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)]">
          {flows.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <GitBranch
                className="mx-auto size-8 text-[var(--console-faint)]"
                aria-hidden
              />
              <p className="mt-4 text-[14px] font-medium text-[var(--console-ink)]">
                No flows registered
              </p>
              <p className="mx-auto mt-1 max-w-sm text-[13px] text-[var(--console-muted)]">
                Flow definitions live under{" "}
                <code className="rounded bg-[var(--console-panel)] px-1.5 py-0.5 text-[12px]">
                  src/lib/flows
                </code>
                .
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--console-line)]">
              {flows.map((flow) => {
                const typeCounts = flow.stages.reduce(
                  (acc, stage) => {
                    acc[stage.type] = (acc[stage.type] ?? 0) + 1;
                    return acc;
                  },
                  {} as Record<string, number>,
                );
                return (
                  <li key={flow.key}>
                    <Link
                      href={`/app/flows/${flow.key}`}
                      className="block px-4 py-4 transition hover:bg-[var(--console-hover)]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--console-faint)]">
                            {flow.domain}
                          </p>
                          <h2 className="mt-0.5 text-[14px] font-semibold tracking-tight text-[var(--console-ink)]">
                            {flow.name}
                          </h2>
                          <p className="mt-1 max-w-xl text-[12px] text-[var(--console-muted)]">
                            {flow.description}
                          </p>
                          <p className="mt-2 text-[11px] text-[var(--console-faint)]">
                            {flow.stages.map((s) => s.name).join(" → ")}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(["agent", "human", "script"] as const).map(
                            (type) => {
                              const count = typeCounts[type];
                              if (!count) return null;
                              const meta = stageMeta(type);
                              return (
                                <span
                                  key={type}
                                  className={cn(
                                    "rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                                    meta.badgeClass,
                                  )}
                                >
                                  {count} {meta.label.toLowerCase()}
                                  {count === 1 ? "" : "s"}
                                </span>
                              );
                            },
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
