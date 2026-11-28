"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  GitPullRequest,
  Loader2,
  Pencil,
  Play,
  RotateCcw,
  ShieldCheck,
  Square,
  X,
} from "lucide-react";
import {
  advanceWorkItemAction,
  moveWorkItemAction,
  updateWorkItemAction,
} from "@/app/actions";
import {
  ActivityList,
  WorkingNowPanel,
  card,
  scriptVerbs,
} from "@/components/agent-activity";
import { AiPanel } from "@/components/ai-panel";
import { FlowControls } from "@/components/flow-controls";
import { LiveRefresh } from "@/components/live-refresh";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { parseStageConfig } from "@/lib/flows/stage-config";
import { legalOutcomesForStage } from "@/lib/flows/transitions";
import {
  scrubVendorNames,
  stageDescriptionForDisplay,
} from "@/lib/issues/agent-labels";
import { splitBriefSections, type AgentOutput } from "@/lib/issues/brief-sections";
import {
  formatRelativeTime,
  latestEventForStage,
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
import type { WorkItemJobState } from "@/lib/jobs/queue";
import type { ModelOption } from "@/lib/models";
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
  flowInputs?: { key: string; label: string }[];
  /** Background-work marker from the server render (see /api/work/activity). */
  activity?: { stamp: string; active: boolean };
  jobState?: WorkItemJobState;
  modelOptions?: ModelOption[];
  defaultModelRef?: string | null;
};

function titleCase(value: string): string {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
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
  flowInputs = [],
  activity = { stamp: "", active: false },
  jobState = { active: null, failed: null },
  modelOptions = [],
  defaultModelRef = null,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(item.title);
  const [body, setBody] = useState(item.body);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
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
  const latestAgentRun = agentRuns[0] ?? null;
  const agentRunActive = Boolean(
    latestAgentRun && isActiveAgentRunStatus(latestAgentRun.status),
  );
  const stopped = item.status === "stopped";
  // Done or stopped: nothing more will run.
  const done = item.status === "done" || stopped;
  const working = !done && (Boolean(jobState.active) || agentRunActive);
  const pollActive =
    activity.active ||
    working ||
    (!done &&
      (current?.stage_key === "build" || current?.stage_key === "validate"));

  const { brief, outputs } = splitBriefSections(item.body);
  const inputEntries = flowInputs.length
    ? flowInputs
        .map((field) => ({
          label: field.label,
          value: (item.inputs?.[field.key] ?? "").trim(),
        }))
        .filter((entry) => entry.value && entry.label !== "Title")
    : Object.entries(item.inputs ?? {})
        .map(([key, value]) => ({ label: key, value: value.trim() }))
        .filter((entry) => entry.value && entry.label !== "title");

  const prLinks = [
    ...externalLinks.filter((l) => l.link_type.includes("pull")),
    ...(latestAgentRun?.pr_url &&
    !externalLinks.some((l) => l.url === latestAgentRun.pr_url)
      ? [
          {
            id: `run_${latestAgentRun.id}`,
            url: latestAgentRun.pr_url,
            title: "Pull request",
            provider: latestAgentRun.provider,
            link_type: "pull_request",
            external_id: "",
          },
        ]
      : []),
  ];

  function run(key: string, fn: () => Promise<string | void>, fallback: string) {
    setError(null);
    setNotice(null);
    setPendingAction(key);
    startTransition(async () => {
      try {
        const message = await fn();
        if (message) setNotice(message);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error && err.message ? err.message : fallback);
      } finally {
        setPendingAction(null);
      }
    });
  }

  function onAdvance(outcome: string, options?: { execute?: boolean }) {
    const formData = new FormData();
    formData.set("itemId", item.id);
    formData.set("outcome", outcome);
    if (options?.execute) formData.set("execute", "1");
    run(
      outcome,
      async () => (await advanceWorkItemAction(formData)).summary,
      "Could not advance this item.",
    );
  }

  function onMove(stageId: string) {
    const formData = new FormData();
    formData.set("itemId", item.id);
    formData.set("stageId", stageId);
    run(
      stageId,
      async () => {
        await moveWorkItemAction(formData);
      },
      "That move is not allowed.",
    );
  }

  function save() {
    const formData = new FormData();
    formData.set("itemId", item.id);
    formData.set("title", title);
    formData.set("body", body);
    run(
      "save",
      async () => {
        await updateWorkItemAction(formData);
        setEditing(false);
        return "Brief saved.";
      },
      "Could not save brief.",
    );
  }

  const outcomes =
    flowBacked && current ? legalOutcomesForStage(current, transitions) : [];

  return (
    <div className="space-y-5">
      <LiveRefresh workItemId={item.id} active={pollActive} stamp={activity.stamp} />

      <header className="animate-rise space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[24px] font-semibold tracking-tight text-[var(--console-ink)]">
              {item.title}
            </h1>
            <p className="mt-1 text-[12px] text-[var(--console-faint)]">
              {stopped && item.stopped_at
                ? `Stopped ${formatRelativeTime(item.stopped_at)}${
                    item.stopped_by ? ` by ${item.stopped_by}` : ""
                  }`
                : `Updated ${formatRelativeTime(item.updated_at)}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {prLinks[0] ? (
              <a
                href={prLinks[0].url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-3 text-[12px] font-medium text-[var(--console-ink)] ring-1 ring-[var(--console-line)] transition hover:text-[var(--console-accent)] hover:ring-[var(--console-accent)]"
              >
                <GitPullRequest className="size-3.5" />
                {prLinks[0].external_id ? `PR #${prLinks[0].external_id}` : "Pull request"}
                <ExternalLink className="size-3 text-[var(--console-faint)]" />
              </a>
            ) : null}
            <FlowControls
              itemId={item.id}
              status={item.status}
              afterDeleteHref="/app/work"
              onResult={(result) => {
                setError(result.error ?? null);
                setNotice(result.notice ?? null);
              }}
            />
          </div>
        </div>
        <StageStepper
          ordered={ordered}
          item={item}
          working={working}
          needsYou={!done && current?.stage_type === "human"}
        />
      </header>

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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-5">
          <NowPanel
            item={item}
            current={current}
            ordered={ordered}
            flowBacked={flowBacked}
            outcomes={outcomes}
            runEvents={runEvents}
            outputs={outputs}
            prLinks={prLinks}
            latestAgentRun={latestAgentRun}
            agentRunActive={agentRunActive}
            jobState={jobState}
            pending={pending}
            pendingAction={pendingAction}
            onAdvance={onAdvance}
            onMove={onMove}
          />

          <section className={card}>
            <header className="flex items-center justify-between gap-2 border-b border-[var(--console-line)] px-4 py-3">
              <h2 className="text-[13px] font-semibold text-[var(--console-ink)]">
                Brief
              </h2>
              {!editing ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing(true)}
                  className="h-7 gap-1.5 text-[12px] text-[var(--console-muted)]"
                >
                  <Pencil className="size-3" />
                  Edit
                </Button>
              ) : null}
            </header>
            {editing ? (
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
                    Context (markdown — includes agent drafts)
                  </label>
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="min-h-64 border-[var(--console-line)] bg-white font-mono text-[12px] shadow-none focus-visible:border-[var(--console-accent)] focus-visible:ring-[var(--console-accent-ring)]"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={save}
                    disabled={pending}
                    className="h-8 gap-1.5 bg-[var(--console-ink)] text-[12px] text-white hover:bg-[var(--console-accent)]"
                  >
                    {pendingAction === "save" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : null}
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setEditing(false);
                      setTitle(item.title);
                      setBody(item.body);
                    }}
                    className="h-8 text-[12px] text-[var(--console-muted)]"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 p-4">
                {inputEntries.length ? (
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {inputEntries.map((entry) => (
                      <div key={entry.label} className="min-w-0">
                        <dt className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--console-faint)]">
                          {entry.label}
                        </dt>
                        <dd className="mt-0.5 whitespace-pre-wrap text-[13px] text-[var(--console-ink)]">
                          {entry.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {brief ? (
                  <Markdown>{brief}</Markdown>
                ) : !inputEntries.length ? (
                  <p className="text-[13px] text-[var(--console-faint)]">
                    No brief yet.
                  </p>
                ) : null}
              </div>
            )}
          </section>

          {outputs.length > 0 ? (
            <section className={card}>
              <header className="border-b border-[var(--console-line)] px-4 py-3">
                <h2 className="text-[13px] font-semibold text-[var(--console-ink)]">
                  Agent drafts
                </h2>
              </header>
              <ul className="divide-y divide-[var(--console-line)]">
                {[...outputs].reverse().map((output, i) => (
                  <li key={`${output.heading}-${i}`}>
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-[13px] text-[var(--console-ink)] hover:bg-[var(--console-hover)]">
                        <ChevronRight className="size-3.5 text-[var(--console-faint)] transition group-open:rotate-90" />
                        <Bot className="size-3.5 text-[var(--console-accent)]" />
                        <span className="font-medium">{output.heading}</span>
                        {i === 0 ? (
                          <span className="text-[11px] text-[var(--console-faint)]">
                            latest
                          </span>
                        ) : null}
                      </summary>
                      <div className="px-4 pt-1 pb-4 pl-10">
                        <Markdown>{output.content}</Markdown>
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <ActivityList runEvents={runEvents} />

          {externalLinks.length > 0 ? (
            <section className={card}>
              <header className="border-b border-[var(--console-line)] px-4 py-3">
                <h2 className="text-[13px] font-semibold text-[var(--console-ink)]">
                  Linked artifacts
                </h2>
              </header>
              <ul className="divide-y divide-[var(--console-line)]">
                {externalLinks.map((link) => (
                  <li key={link.id} className="px-4 py-2.5">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-center gap-2.5"
                    >
                      <GitPullRequest className="size-3.5 shrink-0 text-[var(--console-ink)]" />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--console-ink)] group-hover:text-[var(--console-accent)]">
                        {link.title ||
                          (link.external_id ? `PR #${link.external_id}` : link.link_type)}
                      </span>
                      <span className="shrink-0 text-[11px] text-[var(--console-faint)]">
                        {link.provider} · {link.link_type}
                      </span>
                      <ExternalLink className="size-3 shrink-0 text-[var(--console-faint)]" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside
          className={cn(
            card,
            "flex flex-col xl:sticky xl:top-6 xl:h-[calc(100dvh-3rem)] xl:self-start",
          )}
        >
          <div className="border-b border-[var(--console-line)] px-4 py-3">
            <p className="text-[13px] font-semibold text-[var(--console-ink)]">
              Discussion
            </p>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <AiPanel
              processId={processId}
              workItemId={item.id}
              initialMessages={messages}
              title="Discussion"
              embedded
              modelOptions={modelOptions}
              defaultModelRef={defaultModelRef}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

function StageStepper({
  ordered,
  item,
  working,
  needsYou,
}: {
  ordered: Stage[];
  item: WorkItem;
  working: boolean;
  needsYou: boolean;
}) {
  return (
    <ol className="flex items-center gap-1 overflow-x-auto pb-1">
      {ordered.map((stage, index) => {
        const state = stageProgressState(ordered, item.stage_id, item.status, stage);
        const isCurrent = state === "current";
        return (
          <li key={stage.id} className="flex shrink-0 items-center gap-1">
            {index > 0 ? (
              <span
                className={cn(
                  "h-px w-4",
                  state === "upcoming"
                    ? "bg-[var(--console-line)]"
                    : "bg-[var(--console-accent)]/40",
                )}
              />
            ) : null}
            <span
              title={stage.description || stage.name}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium",
                state === "past" && "text-[var(--console-muted)]",
                state === "upcoming" && "text-[var(--console-faint)]",
                isCurrent &&
                  (needsYou
                    ? "bg-amber-100 text-amber-900 ring-1 ring-amber-300"
                    : "bg-[var(--console-accent-soft)] text-[var(--console-accent)] ring-1 ring-[var(--console-accent)]/30"),
              )}
            >
              {state === "past" ? (
                <CheckCircle2 className="size-3.5 text-[var(--console-accent)]" />
              ) : isCurrent && working ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : isCurrent && needsYou ? (
                <ShieldCheck className="size-3.5" />
              ) : (
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    isCurrent ? "bg-current" : "bg-[var(--console-line)]",
                  )}
                />
              )}
              {stage.name}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

type NowPanelProps = {
  item: WorkItem;
  current: Stage | null;
  ordered: Stage[];
  flowBacked: boolean;
  outcomes: string[];
  runEvents: StageRunEvent[];
  outputs: AgentOutput[];
  prLinks: { id: string; url: string; title: string; external_id: string }[];
  latestAgentRun: AgentRun | null;
  agentRunActive: boolean;
  jobState: WorkItemJobState;
  pending: boolean;
  pendingAction: string | null;
  onAdvance: (outcome: string, options?: { execute?: boolean }) => void;
  onMove: (stageId: string) => void;
};

/** The one thing that matters right now: who is working, or what needs you. */
function NowPanel(props: NowPanelProps) {
  const {
    item,
    current,
    ordered,
    flowBacked,
    jobState,
    latestAgentRun,
    agentRunActive,
    pending,
    pendingAction,
    onAdvance,
    onMove,
  } = props;

  if (item.status === "done") {
    return (
      <section className={cn(card, "ring-emerald-200")}>
        <div className="flex items-center gap-3 bg-emerald-50 px-5 py-4">
          <CheckCircle2 className="size-5 text-emerald-600" />
          <div>
            <p className="text-[14px] font-semibold text-emerald-900">Done</p>
            <p className="text-[12px] text-emerald-800/80">
              Finished {formatRelativeTime(item.updated_at)}.
            </p>
          </div>
        </div>
        <PrList links={props.prLinks} />
      </section>
    );
  }

  if (item.status === "stopped") {
    return (
      <section className={card}>
        <div className="flex items-center gap-3 bg-[var(--console-panel)] px-5 py-4">
          <Square className="size-5 text-[var(--console-muted)]" />
          <div>
            <p className="text-[14px] font-semibold text-[var(--console-ink)]">
              Stopped{current ? ` at ${current.name}` : ""}
            </p>
            <p className="text-[12px] text-[var(--console-muted)]">
              Work in progress was cancelled
              {item.stopped_at ? ` ${formatRelativeTime(item.stopped_at)}` : ""}.
            </p>
          </div>
        </div>
        <PrList links={props.prLinks} />
      </section>
    );
  }

  if (!current) {
    return null;
  }

  const config = parseStageConfig(current.config);
  const runOutcome = current.stage_type === "agent" ? "done" : "success";
  const runButton = (label: string, Icon: typeof Play) => (
    <Button
      type="button"
      size="sm"
      disabled={pending}
      onClick={() => onAdvance(runOutcome, { execute: true })}
      className="h-8 gap-1.5 bg-[var(--console-ink)] text-[12px] text-white hover:bg-[var(--console-accent)]"
    >
      {pendingAction === runOutcome ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <Icon className="size-3.5" />
      )}
      {label}
    </Button>
  );

  // 1. Something is running on the worker (or an external coding agent).
  if (jobState.active || agentRunActive) {
    return (
      <WorkingNowPanel
        current={current}
        jobState={jobState}
        latestAgentRun={latestAgentRun}
        agentRunActive={agentRunActive}
        footer={<PrList links={props.prLinks} />}
      />
    );
  }

  // 2. The last automated attempt failed — say so and offer a retry.
  if (
    jobState.failed &&
    (!jobState.failed.stageId || jobState.failed.stageId === current.id)
  ) {
    return (
      <section className={cn(card, "ring-red-200")}>
        <div className="bg-red-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-red-700">
                Stalled · {formatRelativeTime(jobState.failed.at)}
              </p>
              <p className="mt-0.5 text-[16px] font-semibold text-red-950">
                {current.name} failed
              </p>
              {jobState.failed.error ? (
                <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-white/70 px-3 py-2 text-[11px] whitespace-pre-wrap text-red-900 ring-1 ring-red-200">
                  {jobState.failed.error}
                </pre>
              ) : null}
            </div>
          </div>
          {flowBacked && (current.stage_type === "agent" || current.stage_type === "script") ? (
            <div className="mt-3 pl-8">{runButton("Try again", RotateCcw)}</div>
          ) : null}
        </div>
      </section>
    );
  }

  // 3. A human gate — show exactly what is being approved, with the decision.
  if (current.stage_type === "human") {
    const lastEvent = props.runEvents[props.runEvents.length - 1];
    const reviewDraft =
      lastEvent?.stage_type === "agent" ? props.outputs[props.outputs.length - 1] : null;
    const decisions = flowBacked ? (
      <div className="flex flex-wrap gap-1.5">
        {props.outcomes.map((outcome) => (
          <Button
            key={outcome}
            type="button"
            size="sm"
            variant={outcome === "reject" ? "outline" : "default"}
            disabled={pending}
            onClick={() => onAdvance(outcome)}
            className={cn(
              "h-8 gap-1.5 text-[12px]",
              outcome === "reject"
                ? "border-[var(--console-line)] bg-white text-[var(--console-ink)] hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                : "bg-emerald-600 text-white hover:bg-emerald-700",
            )}
          >
            {pendingAction === outcome ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : outcome === "reject" ? (
              <X className="size-3.5" />
            ) : (
              <Check className="size-3.5" />
            )}
            {outcome === "approve"
              ? "Approve"
              : outcome === "reject"
                ? "Request changes"
                : titleCase(outcome)}
          </Button>
        ))}
      </div>
    ) : null;
    return (
      <section className={cn(card, "ring-amber-300")}>
        <div className="flex flex-wrap items-center gap-3 border-b border-amber-200 bg-amber-50 px-5 py-4">
          <ShieldCheck className="size-5 shrink-0 text-amber-700" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-amber-800">
              Needs your review
            </p>
            <p className="mt-0.5 text-[16px] font-semibold text-[var(--console-ink)]">
              {current.name}
            </p>
            <p className="text-[12px] text-amber-900/80">
              {String(config.responsible ?? "Owner")} ·{" "}
              {String(config.approves ?? "Approve to continue")}
            </p>
          </div>
          {decisions}
        </div>
        {reviewDraft ? (
          <>
            <div className="px-5 py-4">
              <p className="mb-3 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--console-faint)]">
                <Bot className="size-3.5" />
                {reviewDraft.heading}
              </p>
              <Markdown>{reviewDraft.content}</Markdown>
            </div>
            {decisions ? (
              <div className="flex justify-end border-t border-[var(--console-line)] bg-[var(--console-panel)]/50 px-5 py-3">
                {decisions}
              </div>
            ) : null}
          </>
        ) : (
          <ReviewEvidence
            runEvents={props.runEvents}
            ordered={ordered}
            current={current}
            prLinks={props.prLinks}
          />
        )}
      </section>
    );
  }

  // 4. An automated stage with nothing queued, or a legacy stage.
  const verbs = current.stage_type === "script" ? scriptVerbs(current) : null;
  const legalTargets = !flowBacked ? ordered.filter((s) => s.id !== current.id) : [];
  const lastRun = latestEventForStage(props.runEvents, current);
  const lastFailed = lastRun?.outcome === "failure";
  return (
    <section className={cn(card, lastFailed && "ring-red-200")}>
      <div className="flex flex-wrap items-center gap-3 px-5 py-4">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-[11px] font-medium uppercase tracking-[0.1em]",
              lastFailed ? "text-red-700" : "text-[var(--console-faint)]",
            )}
          >
            {lastFailed ? "Last attempt failed" : "Up next"}
          </p>
          <p className="mt-0.5 text-[16px] font-semibold text-[var(--console-ink)]">
            {current.name}
          </p>
          {current.description ? (
            <p className="text-[12px] text-[var(--console-muted)]">
              {stageDescriptionForDisplay(current)}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {flowBacked && current.stage_type === "agent"
            ? runButton(lastFailed ? "Retry agent" : "Run agent", lastFailed ? RotateCcw : Bot)
            : null}
          {flowBacked && verbs
            ? runButton(
                lastFailed ? `Retry ${current.name.toLowerCase()}` : verbs.action,
                lastFailed ? RotateCcw : verbs.icon,
              )
            : null}
          {legalTargets.map((s) => (
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
          ))}
        </div>
      </div>
      {lastFailed && lastRun?.summary ? (
        <div className="flex items-start gap-2 border-t border-red-100 bg-red-50 px-5 py-3 text-[12px] text-red-800">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <p className="min-w-0 flex-1">{scrubVendorNames(lastRun.summary)}</p>
          <span className="shrink-0 text-red-700/70">
            {formatRelativeTime(lastRun.created_at)}
          </span>
        </div>
      ) : null}
    </section>
  );
}

/** For gates after scripts (e.g. ship approval): PRs and what just ran. */
function ReviewEvidence({
  runEvents,
  ordered,
  current,
  prLinks,
}: {
  runEvents: StageRunEvent[];
  ordered: Stage[];
  current: Stage;
  prLinks: NowPanelProps["prLinks"];
}) {
  // Events since the previous human decision — the work being signed off.
  const recent: StageRunEvent[] = [];
  for (let i = runEvents.length - 1; i >= 0 && recent.length < 4; i -= 1) {
    if (runEvents[i].stage_type === "human") break;
    recent.unshift(runEvents[i]);
  }
  const names = new Map(ordered.map((s) => [s.stage_key || s.id, s.name]));
  if (!recent.length && !prLinks.length) {
    return current.description ? (
      <p className="px-5 py-4 text-[13px] text-[var(--console-muted)]">
        {stageDescriptionForDisplay(current)}
      </p>
    ) : null;
  }
  return (
    <div className="space-y-3 px-5 py-4">
      {prLinks.length ? <PrList links={prLinks} bare /> : null}
      {recent.length ? (
        <ul className="space-y-2">
          {recent.map((event) => (
            <li key={event.id} className="flex items-start gap-2 text-[13px]">
              {event.outcome === "failure" ? (
                <X className="mt-0.5 size-3.5 shrink-0 text-red-600" />
              ) : (
                <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
              )}
              <span className="min-w-0">
                <span className="font-medium text-[var(--console-ink)]">
                  {names.get(event.stage_key) ?? event.stage_key}
                </span>
                {event.summary ? (
                  <span className="text-[var(--console-muted)]">
                    {" "}
                    — {scrubVendorNames(event.summary)}
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function PrList({
  links,
  bare = false,
}: {
  links: NowPanelProps["prLinks"];
  bare?: boolean;
}) {
  if (!links.length) return null;
  return (
    <div
      className={cn(
        "flex flex-wrap gap-2",
        !bare && "border-t border-[var(--console-line)] px-5 py-3",
      )}
    >
      {links.map((link) => (
        <a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-[var(--console-panel)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--console-ink)] hover:text-[var(--console-accent)]"
        >
          <GitPullRequest className="size-3.5 shrink-0" />
          <span className="truncate">
            {link.title || (link.external_id ? `PR #${link.external_id}` : link.url)}
          </span>
          <ExternalLink className="size-3 shrink-0 text-[var(--console-faint)]" />
        </a>
      ))}
    </div>
  );
}
