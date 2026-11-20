import Link from "next/link";
import { Bot, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TeammateRecord } from "@/lib/teammates/types";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<TeammateRecord["status"], string> = {
  scaffolded: "Scaffolded",
  local: "Local runtime",
  stopped: "Stopped",
};

function statusDot(status: TeammateRecord["status"]) {
  switch (status) {
    case "local":
      return "bg-emerald-500";
    case "stopped":
      return "bg-amber-500";
    default:
      return "bg-zinc-300";
  }
}

export function TeammateRoster({ teammates }: { teammates: TeammateRecord[] }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 px-5 py-5 md:px-8 md:py-6">
        <div className="animate-rise min-w-0">
          <p className="text-[12px] text-[var(--console-faint)]">Agents</p>
          <h1 className="mt-0.5 text-[22px] font-semibold tracking-tight text-[var(--console-ink)]">
            Teammates
          </h1>
          <p className="mt-1 text-[13px] text-[var(--console-muted)]">
            Specialist agents with deployable Agent SDK projects.
          </p>
        </div>
        <Link href="/app/teammates/new">
          <Button
            size="sm"
            className="animate-rise h-8 gap-1.5 rounded-md bg-[var(--console-ink)] px-3 text-[12px] text-white hover:bg-[var(--console-accent)]"
          >
            <Plus className="size-3.5" aria-hidden />
            Create teammate
          </Button>
        </Link>
      </header>

      <div className="flex-1 overflow-auto px-5 pb-8 md:px-8">
        <div className="animate-rise-delay mx-auto max-w-[720px] overflow-hidden rounded-xl bg-[var(--console-surface)] shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)]">
          {teammates.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <Bot
                className="mx-auto size-8 text-[var(--console-faint)]"
                aria-hidden
              />
              <p className="mt-4 text-[14px] font-medium text-[var(--console-ink)]">
                No teammates yet
              </p>
              <p className="mx-auto mt-1 max-w-sm text-[13px] text-[var(--console-muted)]">
                Start from a preset or a blank teammate. Consol will scaffold an
                Agent SDK project and open chat.
              </p>
              <Link href="/app/teammates/new" className="mt-5 inline-block">
                <Button
                  size="sm"
                  className="h-8 rounded-md bg-[var(--console-accent)] text-[12px] text-white hover:bg-[var(--console-accent-hover)]"
                >
                  Create teammate
                </Button>
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-[var(--console-line)]">
              {teammates.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/app/teammates/${t.slug}`}
                    className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-[var(--console-hover)]"
                  >
                    <div className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--console-agent)] text-[var(--console-accent)]">
                      <Bot className="size-3.5" aria-hidden />
                      <span
                        className={cn(
                          "absolute bottom-0 right-0 size-2 rounded-full ring-2 ring-white",
                          statusDot(t.status),
                        )}
                        aria-hidden
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[13px] font-medium text-[var(--console-ink)]">
                          {t.name}
                        </p>
                        <span className="rounded bg-[var(--console-agent)] px-1 py-px text-[10px] font-medium text-[var(--console-accent)]">
                          agent
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[12px] text-[var(--console-muted)]">
                        {t.role}
                        <span className="text-[var(--console-faint)]">
                          {" "}
                          · {STATUS_LABEL[t.status]} · :{t.port}
                        </span>
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-[var(--console-faint)]">
                      {t.slug}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
