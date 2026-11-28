"use client";

import { useState, type ReactNode } from "react";
import {
  Bot,
  Clock,
  ExternalLink,
  GitPullRequest,
  Terminal,
} from "lucide-react";
import { Elapsed, useNow } from "@/components/elapsed";
import { parseStageConfig } from "@/lib/flows/stage-config";
import {
  BUILD_AGENT_LABEL,
  VALIDATE_AGENT_LABEL,
  agentLabelForStage,
  scrubVendorNames,
  stageDescriptionForDisplay,
} from "@/lib/issues/agent-labels";
import { formatRelativeTime, stageMeta } from "@/lib/issues/stage-meta";
import type { Stage, StageRunEvent } from "@/lib/factory";
import type { AgentRun } from "@/lib/integrations/agent-runs-shared";
import type { WorkItemJobState } from "@/lib/jobs/queue";
import { cn } from "@/lib/utils";

export const card =
  "overflow-hidden rounded-xl bg-[var(--console-surface)] shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)]";

function isCodingAgentPath(path: unknown): boolean {
  const value = String(path ?? "");
  return value === "coding-agent" || value === "cursor-build";
}

/** What a script stage does, phrased as an action and as ongoing work. */
export function scriptVerbs(stage: Stage): {
  action: string;
  working: string;
  icon: typeof Terminal;
} {
  const config = parseStageConfig(stage.config);
  const path = String(config.path ?? "");
  if (stage.stage_key === "build" || isCodingAgentPath(path)) {
    return {
      action: "Run build",
      working: `${BUILD_AGENT_LABEL} is building the change`,
      icon: GitPullRequest,
    };
  }
  if (stage.stage_key === "validate" || path === "validate-pr-checks") {
    return {
      action: "Run checks",
      working: `${VALIDATE_AGENT_LABEL} is waiting on CI checks`,
      icon: Terminal,
    };
  }
  if (stage.stage_key === "merge" || path === "merge-pr") {
    return { action: "Merge pull request", working: "Merging the pull request", icon: GitPullRequest };
  }
  if (stage.stage_key === "open-pr" || path === "open-pr") {
    return { action: "Open pull request", working: "Opening a pull request", icon: GitPullRequest };
  }
  return { action: "Run script", working: `Running ${stage.name}`, icon: Terminal };
}

/**
 * "Working now" panel: exactly one entry for the one logical agent run on the
 * current stage, labelled with Consol's agent name (never the provider).
 */
export function WorkingNowPanel({
  current,
  jobState,
  latestAgentRun,
  agentRunActive,
  footer,
}: {
  current: Stage;
  jobState: WorkItemJobState;
  latestAgentRun: AgentRun | null;
  agentRunActive: boolean;
  footer?: ReactNode;
}) {
  const now = useNow();
  const agentName = agentLabelForStage(current);
  const verbs = current.stage_type === "script" ? scriptVerbs(current) : null;
  const headline =
    current.stage_type === "agent"
      ? `${agentName} is drafting the ${current.name.toLowerCase()}`
      : verbs?.working ?? `Working on ${current.name}`;
  const description = stageDescriptionForDisplay(current);
  const queued = jobState.active?.status === "queued" && !agentRunActive;
  const since = jobState.active?.since ?? latestAgentRun?.created_at ?? "";
  const queuedLong =
    queued && since && now !== null && now - new Date(since).getTime() > 30_000;
  const runSummary = latestAgentRun?.result_summary
    ? scrubVendorNames(latestAgentRun.result_summary)
    : "";
  return (
    <section
      className={cn(card, "ring-[var(--console-accent)]/30")}
      data-testid="agent-status"
    >
      <div className="relative overflow-hidden bg-[var(--console-accent-soft)] px-5 py-4">
        <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-[var(--console-accent)]/15">
          <div className="h-full w-1/3 animate-[now-sweep_1.6s_ease-in-out_infinite] bg-[var(--console-accent)]" />
        </div>
        <div className="flex items-start gap-3">
          <span className="relative mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-[var(--console-accent)] ring-1 ring-[var(--console-accent)]/20">
            {current.stage_type === "agent" ? (
              <Bot className="size-4.5" />
            ) : (
              <Terminal className="size-4" />
            )}
            <span className="absolute -top-0.5 -right-0.5 flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--console-accent)] opacity-60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-[var(--console-accent)]" />
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--console-accent)]">
              {queued ? "Queued" : "Working now"}
            </p>
            <p
              className="mt-0.5 text-[16px] font-semibold text-[var(--console-ink)]"
              data-testid="agent-status-headline"
            >
              {headline}
            </p>
            {description ? (
              <p className="mt-0.5 text-[12px] text-[var(--console-muted)]">
                {description}
              </p>
            ) : null}
          </div>
          {since ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white px-2 py-1 text-[12px] text-[var(--console-muted)] ring-1 ring-[var(--console-line)]">
              <Clock className="size-3" />
              <Elapsed since={since} />
            </span>
          ) : null}
        </div>
        {queuedLong ? (
          <p className="mt-3 text-[12px] text-amber-800">
            Still waiting for a worker to pick this up — is{" "}
            <code className="rounded bg-white px-1">npm run worker</code> running?
          </p>
        ) : null}
      </div>
      {latestAgentRun && agentRunActive ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[var(--console-line)] px-5 py-3 text-[12px]">
          <span className="text-[var(--console-muted)]">
            {BUILD_AGENT_LABEL} ·{" "}
            <span className="font-medium text-[var(--console-ink)]">
              {latestAgentRun.status.toLowerCase().replace(/_/g, " ")}
            </span>
          </span>
          {latestAgentRun.branch ? (
            <code className="rounded bg-[var(--console-panel)] px-1.5 py-0.5 text-[11px]">
              {latestAgentRun.branch}
            </code>
          ) : null}
          {latestAgentRun.agent_url ? (
            <a
              href={latestAgentRun.agent_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[var(--console-accent)] hover:underline"
            >
              Watch the agent <ExternalLink className="size-3" />
            </a>
          ) : null}
          {runSummary ? (
            <p className="w-full text-[var(--console-muted)]">{runSummary}</p>
          ) : null}
        </div>
      ) : null}
      {footer}
    </section>
  );
}

export function ActivityList({ runEvents }: { runEvents: StageRunEvent[] }) {
  const [showAll, setShowAll] = useState(false);
  const events = [...runEvents].reverse();
  const visible = showAll ? events : events.slice(0, 6);
  return (
    <section className={card} data-testid="activity">
      <header className="border-b border-[var(--console-line)] px-4 py-3">
        <h2 className="text-[13px] font-semibold text-[var(--console-ink)]">
          Activity
        </h2>
      </header>
      {events.length === 0 ? (
        <p className="px-4 py-5 text-[13px] text-[var(--console-muted)]">
          Nothing has run yet.
        </p>
      ) : (
        <>
          <ul className="space-y-0 px-4 py-3">
            {visible.map((event) => {
              const meta = stageMeta(event.stage_type);
              const Icon = meta.icon;
              const failed = event.outcome === "failure" || event.outcome === "reject";
              return (
                <li key={event.id} className="flex gap-3 py-1.5">
                  <Icon
                    className={cn(
                      "mt-0.5 size-3.5 shrink-0",
                      failed ? "text-red-500" : "text-[var(--console-faint)]",
                    )}
                  />
                  <p className="min-w-0 flex-1 text-[12px] leading-relaxed text-[var(--console-muted)]">
                    <span className="font-medium text-[var(--console-ink)]">
                      {event.stage_key || meta.label}
                    </span>
                    {event.outcome ? (
                      <span className={cn(failed && "text-red-600")}> · {event.outcome}</span>
                    ) : null}
                    {event.summary ? <> — {scrubVendorNames(event.summary)}</> : null}
                  </p>
                  <span className="shrink-0 text-[11px] tabular-nums text-[var(--console-faint)]">
                    {formatRelativeTime(event.created_at)}
                  </span>
                </li>
              );
            })}
          </ul>
          {events.length > 6 ? (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="w-full border-t border-[var(--console-line)] px-4 py-2 text-left text-[12px] text-[var(--console-muted)] hover:bg-[var(--console-hover)]"
            >
              {showAll ? "Show less" : `Show all ${events.length}`}
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}
