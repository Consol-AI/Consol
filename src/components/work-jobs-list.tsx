import Link from "next/link";
import { Briefcase, Plus } from "lucide-react";
import { FlowControls } from "@/components/flow-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ATTENTION_LABELS,
  ATTENTION_ORDER,
  type AttentionBucket,
} from "@/lib/issues/attention";
import { stageMeta } from "@/lib/issues/stage-meta";
import type { OrganizationWorkItem } from "@/lib/factory";
import { workItemHref } from "@/lib/work-links";
import { cn } from "@/lib/utils";

function formatRelativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.round(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function bucketForWorkItem(item: OrganizationWorkItem): AttentionBucket {
  if (item.status === "done") return "done";
  if (item.stage_type === "human" || item.stage_type === "legacy") {
    return "needs_you";
  }
  if (item.stage_type === "agent") return "agents_working";
  if (item.stage_type === "script") return "waiting";
  return "waiting";
}

export function WorkJobsList({ items }: { items: OrganizationWorkItem[] }) {
  const groups: Record<AttentionBucket, OrganizationWorkItem[]> = {
    needs_you: [],
    agents_working: [],
    waiting: [],
    done: [],
  };
  const stopped: OrganizationWorkItem[] = [];
  for (const item of items) {
    if (item.status === "stopped") stopped.push(item);
    else groups[bucketForWorkItem(item)].push(item);
  }

  const sections: { key: string; label: string; items: OrganizationWorkItem[] }[] = [
    ...ATTENTION_ORDER.filter(
      (bucket) => bucket !== "done" && groups[bucket].length > 0,
    ).map((bucket) => ({
      key: bucket,
      label: ATTENTION_LABELS[bucket],
      items: groups[bucket],
    })),
    ...(stopped.length
      ? [{ key: "stopped", label: "Stopped", items: stopped }]
      : []),
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex flex-wrap items-end justify-between gap-4 px-5 py-5 md:px-8 md:py-6">
        <div className="animate-rise min-w-0">
          <p className="text-[12px] text-[var(--console-faint)]">Workspace</p>
          <h1 className="mt-0.5 text-[22px] font-semibold tracking-tight text-[var(--console-ink)]">
            Work
          </h1>
          <p className="mt-1 max-w-xl text-[13px] text-[var(--console-muted)]">
            Running jobs across the workspace — see where you are needed, then
            start a flow with the context it requires.
          </p>
        </div>
        <Link href="/app/work/new" className="animate-rise">
          <Button className="h-9 gap-1.5 bg-[var(--console-ink)] text-[13px] text-white hover:bg-[var(--console-accent)]">
            <Plus className="size-3.5" />
            Start flow
          </Button>
        </Link>
      </header>

      <div className="flex-1 overflow-auto px-5 pb-8 md:px-8">
        {items.length === 0 ? (
          <div className="animate-rise-delay mx-auto flex max-w-[520px] flex-col items-center rounded-xl border border-dashed border-[var(--console-line)] bg-[var(--console-surface)] px-6 py-16 text-center shadow-[var(--console-shadow)]">
            <span className="flex size-12 items-center justify-center rounded-full bg-[var(--console-panel)] text-[var(--console-faint)] ring-1 ring-[var(--console-line)]">
              <Briefcase className="size-5" aria-hidden />
            </span>
            <p className="mt-4 text-[14px] font-medium text-[var(--console-ink)]">
              No running work yet
            </p>
            <p className="mt-1 max-w-sm text-[13px] text-[var(--console-muted)]">
              Pick a flow, fill in the required details, and Consol will open a
              job you can advance through its stages.
            </p>
            <Link href="/app/work/new" className="mt-5">
              <Button className="h-9 gap-1.5 bg-[var(--console-ink)] text-[13px] text-white hover:bg-[var(--console-accent)]">
                <Plus className="size-3.5" />
                Start flow
              </Button>
            </Link>
          </div>
        ) : (
          <div className="animate-rise-delay mx-auto max-w-[820px] space-y-5">
            {sections.map((section) => (
              <section
                key={section.key}
                className="overflow-hidden rounded-xl bg-[var(--console-surface)] shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)]"
              >
                <header className="flex items-center justify-between border-b border-[var(--console-line)] px-4 py-3">
                  <div>
                    <h2 className="text-[13px] font-semibold text-[var(--console-ink)]">
                      {section.label}
                    </h2>
                    <p className="text-[11px] text-[var(--console-faint)]">
                      {section.items.length}{" "}
                      {section.items.length === 1 ? "job" : "jobs"}
                    </p>
                  </div>
                  {section.key === "needs_you" ? (
                    <Badge className="h-5 border-transparent bg-[var(--console-accent-soft)] px-1.5 text-[10px] text-[var(--console-accent)]">
                      Action needed
                    </Badge>
                  ) : null}
                </header>
                <ul className="divide-y divide-[var(--console-line)]">
                  {section.items.map((item) => {
                    const meta = stageMeta(item.stage_type);
                    return (
                      <li
                        key={item.id}
                        className="flex items-center gap-2 pr-3 transition hover:bg-[var(--console-hover)]"
                      >
                        <Link
                          href={workItemHref(item)}
                          className="block min-w-0 flex-1 px-4 py-3.5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-[14px] font-semibold tracking-tight text-[var(--console-ink)]">
                                {item.title}
                              </p>
                              <p className="mt-1 text-[12px] text-[var(--console-muted)]">
                                {item.process_name}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "h-5 gap-1 px-1.5 text-[10px]",
                                  meta.badgeClass,
                                )}
                              >
                                {item.stage_name}
                              </Badge>
                              <span className="text-[11px] text-[var(--console-faint)]">
                                {formatRelativeTime(item.updated_at)}
                              </span>
                            </div>
                          </div>
                        </Link>
                        <FlowControls
                          itemId={item.id}
                          status={item.status}
                          compact
                        />
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
