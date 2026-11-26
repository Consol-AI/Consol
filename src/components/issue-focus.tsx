"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  Check,
  CheckCircle2,
  Circle,
  ExternalLink,
  GitPullRequest,
  Loader2,
  Terminal,
  X,
} from "lucide-react";
import {
  advanceWorkItemAction,
  moveWorkItemAction,
  updateWorkItemAction,
} from "@/app/actions";
import { AiPanel } from "@/components/ai-panel";
import { LiveRefresh } from "@/components/live-refresh";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { parseStageConfig } from "@/lib/flows/stage-config";
import { legalOutcomesForStage } from "@/lib/flows/transitions";
import {
  formatRelativeTime,
  latestEventForStage,
  stageMeta,
  stageProgressState,
} from "@/lib/issues/stage-meta";
import type {
  Message,
  Stage,
  StageRunEvent,
  StageTransition,
  WorkItem,
} from "@/lib/factory";
import type { AgentRun } from "@/lib/integrations/agent-runs-shared";
import { isActiveAgentRunStatus } from "@/lib/integrations/agent-runs-shared";
import type { WorkItemExternalLink } from "@/lib/integrations";
import { cn } from "@/lib/utils";

type Props = {
  processId: string;
  item: WorkItem;
  stages: Stage[];
  transitions: StageTransition[];
  flowBacked: boolean;
  runEvents: StageRunEvent[];
  messages: Message[];
  externalLinks?: WorkItemExternalLink[];
  agentRuns?: AgentRun[];
  backHref?: string;
  flowInputs?: { key: string; label: string }[];
  /** Background-work marker from the server render (see /api/work/activity). */
  activity?: { stamp: string; active: boolean };
};


function isCodingAgentPath(path: unknown): boolean {
  const value = String(path ?? "");
  return value === "coding-agent" || value === "cursor-build";
}

export function IssueFocus({
  processId,
  item,
  stages,
  transitions,
  flowBacked,
  runEvents,
  messages,
  externalLinks = [],
  agentRuns = [],
  backHref: backHrefProp,
  flowInputs = [],
  activity = { stamp: "", active: false },
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(item.title);
  const [body, setBody] = useState(item.body);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Reset the draft when the server sends a fresh item (adjust-during-render).
  const [syncedItem, setSyncedItem] = useState(item);
  if (syncedItem !== item) {
    setSyncedItem(item);
    setTitle(item.title);
    setBody(item.body);
  }

  const ordered = [...stages].sort((a, b) => a.position - b.position);
  const current = ordered.find((s) => s.id === item.stage_id) ?? null;
  const currentMeta = stageMeta(current?.stage_type ?? "legacy");
  const latestAgentRun = agentRuns[0] ?? null;
  const pollActive =
    activity.active ||
    (item.status !== "done" &&
    Boolean(
      (latestAgentRun && isActiveAgentRunStatus(latestAgentRun.status)) ||
        current?.stage_key === "build" ||
        current?.stage_key === "validate",
    ));
  const backHref = backHrefProp ?? "/app/work";
  const inputEntries = flowInputs.length
    ? flowInputs
        .map((field) => ({
          label: field.label,
          value: (item.inputs?.[field.key] ?? "").trim(),
        }))
        .filter((entry) => entry.value)
    : Object.entries(item.inputs ?? {}).map(([key, value]) => ({
        label: key,
        value: value.trim(),
      })).filter((entry) => entry.value);

  function save() {
    setError(null);
    setNotice(null);
    const formData = new FormData();
    formData.set("itemId", item.id);
    formData.set("title", title);
    formData.set("body", body);
    startTransition(async () => {
      try {
        await updateWorkItemAction(formData);
        setNotice("Brief saved.");
        router.refresh();
      } catch {
        setError("Could not save brief.");
      }
    });
  }

  function onAdvance(outcome: string, options?: { execute?: boolean }) {
    setError(null);
    setNotice(null);
    const formData = new FormData();
    formData.set("itemId", item.id);
    formData.set("outcome", outcome);
    if (options?.execute) formData.set("execute", "1");
    startTransition(async () => {
      try {
        const result = await advanceWorkItemAction(formData);
        setNotice(result.summary);
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not advance this issue.",
        );
      }
    });
  }

  function onMove(stageId: string) {
    setError(null);
    setNotice(null);
    const formData = new FormData();
    formData.set("itemId", item.id);
    formData.set("stageId", stageId);
    startTransition(async () => {
      try {
        await moveWorkItemAction(formData);
        router.refresh();
      } catch {
        setError("That move is not allowed.");
      }
    });
  }

  const outcomes =
    flowBacked && current
      ? legalOutcomesForStage(current, transitions)
      : [];

  const legalTargets =
    !flowBacked && current
      ? ordered.filter((s) => s.id !== current.id)
      : [];

  return (
    <div className="space-y-5">
      <LiveRefresh
        workItemId={item.id}
        active={pollActive}
        stamp={activity.stamp}
      />
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-[12px] text-[var(--console-faint)] transition hover:text-[var(--console-accent)]"
        >
          <ArrowLeft className="size-3" />
          Back to Work
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--console-faint)]">
            Work
          </p>
          <Badge
            variant="outline"
            className={cn(
              "h-5 border-transparent px-1.5 text-[10px]",
              item.status === "done"
                ? "bg-[var(--console-accent-soft)] text-[var(--console-accent)]"
                : "bg-[var(--console-accent-soft)] text-[var(--console-accent)]",
            )}
          >
            {item.status === "done" ? "Done" : "Open"}
          </Badge>
          {current ? (
            <Badge
              variant="outline"
              className={cn(
                "h-5 gap-1 px-1.5 text-[10px]",
                currentMeta.badgeClass,
              )}
            >
              {current.name}
            </Badge>
          ) : null}
        </div>
        <h1 className="mt-2 text-[24px] font-semibold tracking-tight text-[var(--console-ink)]">
          {item.title}
        </h1>
        <p className="mt-1 text-[13px] text-[var(--console-muted)]">
          Updated {formatRelativeTime(item.updated_at)}
        </p>
        {inputEntries.length ? (
          <dl className="mt-4 grid gap-2 rounded-xl bg-[var(--console-panel)] p-3.5 ring-1 ring-[var(--console-line)] sm:grid-cols-2">
            {inputEntries.map((entry) => (
              <div key={entry.label} className="min-w-0">
                <dt className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--console-faint)]">
                  {entry.label}
                </dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-[12px] text-[var(--console-ink)]">
                  {entry.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>

      {error || notice ? (
        <div
          className={cn(
            "rounded-lg px-3.5 py-2.5 text-[12px]",
            error
              ? "bg-red-50 text-red-700"
              : "bg-[var(--console-accent-soft)] text-[var(--console-accent)]",
          )}
        >
          {error ?? notice}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-xl bg-[var(--console-surface)] shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)]">
            <header className="border-b border-[var(--console-line)] px-4 py-3">
              <h2 className="text-[13px] font-semibold text-[var(--console-ink)]">
                Process
              </h2>
              <p className="mt-0.5 text-[12px] text-[var(--console-muted)]">
                Where this issue is in the flow, and what happens next.
              </p>
            </header>
            <ol className="space-y-0 p-4">
              {ordered.map((stage, index) => {
                const state = stageProgressState(
                  ordered,
                  item.stage_id,
                  item.status,
                  stage,
                );
                const meta = stageMeta(stage.stage_type);
                const Icon = meta.icon;
                const config = parseStageConfig(stage.config);
                const event = latestEventForStage(runEvents, stage);
                const isCurrent = state === "current";
                return (
                  <li key={stage.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {index < ordered.length - 1 ? (
                      <span
                        className={cn(
                          "absolute left-[15px] top-8 bottom-0 w-px",
                          state === "past"
                            ? "bg-[var(--console-accent)]/40"
                            : "bg-[var(--console-line)]",
                        )}
                      />
                    ) : null}
                    <div
                      className={cn(
                        "relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-full ring-2 ring-[var(--console-surface)]",
                        state === "past" &&
                          "bg-[var(--console-accent)] text-white",
                        state === "current" &&
                          "bg-[var(--console-accent-soft)] text-[var(--console-accent)]",
                        state === "upcoming" &&
                          "bg-[var(--console-panel)] text-[var(--console-faint)]",
                      )}
                    >
                      {state === "past" ? (
                        <CheckCircle2 className="size-4" />
                      ) : state === "current" ? (
                        <Icon className="size-3.5" />
                      ) : (
                        <Circle className="size-3.5" />
                      )}
                    </div>
                    <div
                      className={cn(
                        "min-w-0 flex-1 rounded-lg px-3 py-2.5",
                        isCurrent &&
                          "bg-[var(--console-panel)]/80 ring-1 ring-[var(--console-line)]",
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p
                          className={cn(
                            "text-[13px] font-semibold",
                            state === "upcoming"
                              ? "text-[var(--console-faint)]"
                              : "text-[var(--console-ink)]",
                          )}
                        >
                          {stage.name}
                        </p>
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
                        {isCurrent ? (
                          <Badge
                            variant="outline"
                            className="h-5 border-transparent bg-[var(--console-ink)] px-1.5 text-[10px] text-white"
                          >
                            Current
                          </Badge>
                        ) : null}
                      </div>
                      {stage.description ? (
                        <p
                          className={cn(
                            "mt-1 text-[12px] leading-relaxed",
                            state === "upcoming"
                              ? "text-[var(--console-faint)]"
                              : "text-[var(--console-muted)]",
                          )}
                        >
                          {stage.description}
                        </p>
                      ) : null}
                      {isCurrent && stage.stage_type === "human" ? (
                        <p className="mt-1.5 text-[12px] text-[var(--console-muted)]">
                          <span className="font-medium text-[var(--console-ink)]">
                            {String(config.responsible ?? "Owner")}
                          </span>
                          {" · "}
                          {String(config.approves ?? "Approve to continue")}
                        </p>
                      ) : null}
                      {state === "past" && event?.summary ? (
                        <p className="mt-1.5 text-[11px] text-[var(--console-faint)]">
                          {event.summary}
                          {event.created_at
                            ? ` · ${formatRelativeTime(event.created_at)}`
                            : ""}
                        </p>
                      ) : null}

                      {isCurrent && item.status !== "done" ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {flowBacked && stage.stage_type === "agent" ? (
                            <Button
                              type="button"
                              size="sm"
                              disabled={pending}
                              onClick={() =>
                                onAdvance("done", { execute: true })
                              }
                              className="h-8 gap-1.5 bg-[var(--console-ink)] text-[12px] text-white hover:bg-[var(--console-accent)]"
                            >
                              {pending ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Bot className="size-3.5" />
                              )}
                              Run agent
                            </Button>
                          ) : null}
                          {flowBacked && stage.stage_type === "script" ? (
                            <Button
                              type="button"
                              size="sm"
                              disabled={pending}
                              onClick={() =>
                                onAdvance("success", { execute: true })
                              }
                              className="h-8 gap-1.5 bg-zinc-900 text-[12px] text-white hover:bg-zinc-700"
                            >
                              {pending ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : stage.stage_key === "build" ||
                                stage.stage_key === "merge" ||
                                isCodingAgentPath(config.path) ||
                                String(config.path ?? "") === "open-pr" ? (
                                <GitPullRequest className="size-3.5" />
                              ) : (
                                <Terminal className="size-3.5" />
                              )}
                              {stage.stage_key === "build" ||
                              isCodingAgentPath(config.path)
                                ? "Run build"
                                : stage.stage_key === "validate"
                                  ? "Run checks"
                                  : stage.stage_key === "merge"
                                    ? "Merge pull request"
                                    : stage.stage_key === "open-pr" ||
                                        String(config.path ?? "") === "open-pr"
                                      ? "Open pull request"
                                      : "Run script"}
                            </Button>
                          ) : null}
                          {flowBacked && stage.stage_type === "human"
                            ? outcomes.map((outcome) => (
                                <Button
                                  key={outcome}
                                  type="button"
                                  size="sm"
                                  variant={
                                    outcome === "reject" ? "outline" : "default"
                                  }
                                  disabled={pending}
                                  onClick={() => onAdvance(outcome)}
                                  className={cn(
                                    "h-8 gap-1.5 text-[12px]",
                                    outcome === "reject"
                                      ? "border-[var(--console-line)] bg-white text-[var(--console-muted)] hover:bg-[var(--console-hover)]"
                                      : "bg-[var(--console-ink)] text-white hover:bg-[var(--console-accent)]",
                                  )}
                                >
                                  {pending ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                  ) : outcome === "reject" ? (
                                    <X className="size-3.5" />
                                  ) : (
                                    <Check className="size-3.5" />
                                  )}
                                  {outcome === "approve"
                                    ? "Approve"
                                    : outcome === "reject"
                                      ? "Reject"
                                      : outcome}
                                </Button>
                              ))
                            : null}
                          {!flowBacked
                            ? legalTargets.map((s) => (
                                <Button
                                  key={s.id}
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={pending}
                                  onClick={() => onMove(s.id)}
                                  className="h-8 border-[var(--console-line)] bg-white text-[12px] text-[var(--console-muted)] hover:border-[var(--console-accent)] hover:text-[var(--console-accent)]"
                                >
                                  → {s.name}
                                </Button>
                              ))
                            : null}
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {latestAgentRun ? (
            <section className="overflow-hidden rounded-xl bg-[var(--console-surface)] shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)]">
              <header className="border-b border-[var(--console-line)] px-4 py-3">
                <h2 className="text-[13px] font-semibold text-[var(--console-ink)]">
                  Cursor agent
                </h2>
                <p className="mt-0.5 text-[12px] text-[var(--console-muted)]">
                  Cloud Agent run persisted for this delivery.
                </p>
              </header>
              <div className="space-y-2 px-4 py-3 text-[12px]">
                <p className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="h-5 border-transparent bg-[var(--console-panel)] px-1.5 text-[10px]"
                  >
                    {latestAgentRun.status}
                  </Badge>
                  {latestAgentRun.agent_url ? (
                    <a
                      href={latestAgentRun.agent_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[var(--console-accent)] hover:underline"
                    >
                      Open in Cursor
                      <ExternalLink className="size-3" />
                    </a>
                  ) : null}
                </p>
                {latestAgentRun.pr_url ? (
                  <p className="truncate text-[var(--console-muted)]">
                    PR:{" "}
                    <a
                      href={latestAgentRun.pr_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--console-accent)] hover:underline"
                    >
                      {latestAgentRun.pr_url}
                    </a>
                  </p>
                ) : null}
                {latestAgentRun.result_summary ? (
                  <p className="text-[var(--console-faint)]">
                    {latestAgentRun.result_summary}
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}

          {externalLinks.length > 0 ? (
            <section className="overflow-hidden rounded-xl bg-[var(--console-surface)] shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)]">
              <header className="border-b border-[var(--console-line)] px-4 py-3">
                <h2 className="text-[13px] font-semibold text-[var(--console-ink)]">
                  Linked artifacts
                </h2>
                <p className="mt-0.5 text-[12px] text-[var(--console-muted)]">
                  External links created by integrations.
                </p>
              </header>
              <ul className="divide-y divide-[var(--console-line)]">
                {externalLinks.map((link) => (
                  <li key={link.id} className="px-4 py-3">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-start gap-2.5"
                    >
                      <GitPullRequest
                        className="mt-0.5 size-3.5 shrink-0 text-[var(--console-ink)]"
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-medium text-[var(--console-ink)] group-hover:text-[var(--console-accent)]">
                            {link.title ||
                              (link.external_id
                                ? `PR #${link.external_id}`
                                : link.link_type)}
                          </span>
                          <Badge
                            variant="outline"
                            className="h-5 border-transparent bg-[var(--console-panel)] px-1.5 text-[10px] text-[var(--console-muted)]"
                          >
                            {link.provider} · {link.link_type}
                          </Badge>
                          <ExternalLink className="size-3 text-[var(--console-faint)]" />
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-[var(--console-faint)]">
                          {link.url}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="overflow-hidden rounded-xl bg-[var(--console-surface)] shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)]">
            <header className="border-b border-[var(--console-line)] px-4 py-3">
              <h2 className="text-[13px] font-semibold text-[var(--console-ink)]">
                Activity
              </h2>
            </header>
            {runEvents.length === 0 ? (
              <p className="px-4 py-6 text-[13px] text-[var(--console-muted)]">
                No stage runs yet. Advance the current stage to build history.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--console-line)]">
                {[...runEvents].reverse().map((event) => {
                  const meta = stageMeta(event.stage_type);
                  return (
                    <li key={event.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-5 px-1.5 text-[10px]",
                            meta.badgeClass,
                          )}
                        >
                          {event.stage_key || meta.label}
                        </Badge>
                        {event.outcome ? (
                          <span className="text-[11px] text-[var(--console-faint)]">
                            {event.outcome}
                          </span>
                        ) : null}
                        <span className="ml-auto text-[11px] tabular-nums text-[var(--console-faint)]">
                          {formatRelativeTime(event.created_at)}
                        </span>
                      </div>
                      {event.summary ? (
                        <p className="mt-1 text-[13px] text-[var(--console-ink)]">
                          {event.summary}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="overflow-hidden rounded-xl bg-[var(--console-surface)] shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)]">
            <header className="border-b border-[var(--console-line)] px-4 py-3">
              <h2 className="text-[13px] font-semibold text-[var(--console-ink)]">
                Brief
              </h2>
            </header>
            <div className="space-y-3 p-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-[var(--console-muted)]">
                  Title
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-9 border-[var(--console-line)] bg-white text-[13px] shadow-none focus-visible:border-[var(--console-accent)] focus-visible:ring-[var(--console-accent-ring)]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-[var(--console-muted)]">
                  Context
                </label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="min-h-28 border-[var(--console-line)] bg-white text-[13px] shadow-none focus-visible:border-[var(--console-accent)] focus-visible:ring-[var(--console-accent-ring)]"
                />
              </div>
              <Button
                type="button"
                onClick={save}
                disabled={pending}
                className="h-8 gap-1.5 bg-[var(--console-ink)] text-[12px] text-white hover:bg-[var(--console-accent)]"
              >
                {pending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : null}
                {pending ? "Saving…" : "Save"}
              </Button>
            </div>
          </section>
        </div>

        <aside className="overflow-hidden rounded-xl bg-[var(--console-surface)] shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)] xl:sticky xl:top-6 xl:self-start">
          <div className="border-b border-[var(--console-line)] px-4 py-3">
            <p className="text-[13px] font-semibold text-[var(--console-ink)]">
              Item AI
            </p>
          </div>
          <AiPanel
            processId={processId}
            workItemId={item.id}
            initialMessages={messages}
            title="Item AI"
            embedded
          />
        </aside>
      </div>
    </div>
  );
}
