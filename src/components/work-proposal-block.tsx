"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  GitBranch,
  Loader2,
  Pencil,
  Play,
  X,
} from "lucide-react";
import { FlowInputControl } from "@/components/flow-input-control";
import { LiveDot } from "@/components/live-dot";
import { Button } from "@/components/ui/button";
import type { Message } from "@/lib/factory";
import {
  proposalFields,
  proposalInputsComplete,
  REPO_INPUT_KEY,
  type ProposalFlowOption,
  type WorkProposalView,
} from "@/lib/proposals/types";
import { cn } from "@/lib/utils";

const POLL_MS = 5_000;

type Props = {
  proposal: WorkProposalView;
  flows: ProposalFlowOption[];
  /** Repos to offer as one-click picks when the repo field is empty. */
  knownRepos: string[];
  onChange: (proposal: WorkProposalView) => void;
  /** Thread message the server posted when work started. */
  onMessage: (message: Message) => void;
};

/** Is this proposal's work still moving without a human (worth polling)? */
function isLive(proposal: WorkProposalView): boolean {
  if (proposal.state === "starting") return true;
  const item = proposal.work_item;
  return Boolean(
    proposal.state === "confirmed" &&
      item &&
      item.status === "open" &&
      item.stage_type !== "human" &&
      item.stage_type !== "legacy",
  );
}

function statusLabel(item: NonNullable<WorkProposalView["work_item"]>): string {
  if (item.status === "done") return "done";
  if (item.status === "stopped") return "stopped";
  if (item.stage_type === "human" || item.stage_type === "legacy") {
    return "needs you";
  }
  if (item.stage_type === "agent" || item.stage_type === "script") {
    return "running";
  }
  return item.status;
}

async function readError(res: Response): Promise<string> {
  const data = (await res.json().catch(() => null)) as {
    error?: string;
  } | null;
  return data?.error || `Request failed (${res.status})`;
}

export function WorkProposalBlock({
  proposal,
  flows,
  knownRepos,
  onChange,
  onMessage,
}: Props) {
  const [flowKey, setFlowKey] = useState(proposal.flow_key);
  const [values, setValues] = useState<Record<string, string>>(
    proposal.inputs,
  );
  const [busy, setBusy] = useState<"start" | "dismiss" | null>(null);
  const [error, setError] = useState<string | null>(proposal.error);

  const flow = useMemo(
    () => flows.find((entry) => entry.key === flowKey) ?? null,
    [flows, flowKey],
  );
  const complete = flow ? proposalInputsComplete(flow, values) : false;
  const [editing, setEditing] = useState(!complete);
  const open = proposal.state === "proposed";
  const live = isLive(proposal);
  const proposalId = proposal.id;

  // Live stage/status for started work (and recovery while "starting").
  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      const res = await fetch(`/api/proposals/${proposalId}`).catch(() => null);
      if (!res?.ok || cancelled) return;
      const data = (await res.json()) as { proposal: WorkProposalView };
      onChange(data.proposal);
    }, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [live, proposalId, onChange]);

  async function start() {
    if (!flow || !complete || busy) return;
    setBusy("start");
    setError(null);
    try {
      const res = await fetch(`/api/proposals/${proposal.id}/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ flowKey: flow.key, inputs: values }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const data = (await res.json()) as {
        proposal: WorkProposalView;
        message: Message | null;
      };
      onChange(data.proposal);
      if (data.proposal.error) setError(data.proposal.error);
      if (data.message) onMessage(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start work");
    } finally {
      setBusy(null);
    }
  }

  async function dismiss() {
    if (busy) return;
    setBusy("dismiss");
    setError(null);
    try {
      const res = await fetch(`/api/proposals/${proposal.id}/dismiss`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await readError(res));
      const data = (await res.json()) as { proposal: WorkProposalView };
      onChange(data.proposal);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not dismiss");
    } finally {
      setBusy(null);
    }
  }

  if (proposal.state === "dismissed" || proposal.state === "superseded") {
    return (
      <div className="mr-8 flex items-center gap-2 rounded-lg border border-dashed border-[var(--console-line)] px-3.5 py-2 text-[12px] text-[var(--console-faint)]">
        <X className="size-3.5" aria-hidden />
        <span className="min-w-0 truncate">
          {proposal.state === "dismissed"
            ? "Proposal dismissed"
            : "Replaced by a newer proposal"}{" "}
          · {proposal.inputs.title || "Untitled"}
        </span>
      </div>
    );
  }

  const fields = flow ? proposalFields(flow) : [];
  const shownFlow =
    flow ?? flows.find((entry) => entry.key === proposal.flow_key) ?? null;
  const item = proposal.work_item;

  return (
    <section
      aria-label="Work proposal"
      className="mr-8 rounded-xl bg-[var(--console-surface)] ring-1 ring-[var(--console-accent)]/40"
    >
      <header className="flex items-center justify-between gap-2 border-b border-[var(--console-line)] px-3.5 py-2.5">
        <p className="flex min-w-0 items-center gap-2 text-[12px] font-semibold text-[var(--console-ink)]">
          <GitBranch
            className="size-3.5 shrink-0 text-[var(--console-accent)]"
            aria-hidden
          />
          <span className="truncate">
            {open ? "Proposed work" : "Work"} · {shownFlow?.name ?? flowKey}
          </span>
        </p>
        {open && !editing ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 gap-1 text-[12px]"
            onClick={() => setEditing(true)}
            disabled={Boolean(busy)}
          >
            <Pencil className="size-3" aria-hidden />
            Edit
          </Button>
        ) : null}
      </header>

      <div className="space-y-3 px-3.5 py-3">
        {open && editing ? (
          <>
            <label className="block space-y-1.5">
              <span className="text-[12px] font-medium text-[var(--console-ink)]">
                Flow
              </span>
              <select
                value={flowKey}
                onChange={(e) => setFlowKey(e.target.value)}
                className="flex h-9 w-full rounded-md border border-[var(--console-line)] bg-white px-3 text-[13px] outline-none focus-visible:border-[var(--console-accent)]"
              >
                {flows.map((entry) => (
                  <option key={entry.key} value={entry.key}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>
            {fields.map((field) => {
              const value = values[field.key] ?? "";
              const missing = field.required && !value.trim();
              return (
                <label key={field.key} className="block space-y-1.5">
                  <span className="text-[12px] font-medium text-[var(--console-ink)]">
                    {field.label}
                    {field.required ? (
                      missing ? (
                        <span className="ml-1 font-normal text-amber-700">
                          (required)
                        </span>
                      ) : null
                    ) : (
                      <span className="ml-1 font-normal text-[var(--console-faint)]">
                        (optional)
                      </span>
                    )}
                  </span>
                  <FlowInputControl
                    field={
                      field.key === REPO_INPUT_KEY
                        ? { ...field, placeholder: "owner/repo" }
                        : field
                    }
                    value={value}
                    onChange={(next) =>
                      setValues((prev) => ({ ...prev, [field.key]: next }))
                    }
                    className={field.type === "text" ? "min-h-20" : undefined}
                  />
                  {field.key === REPO_INPUT_KEY && !value.trim()
                    ? knownRepos.map((repo) => (
                        <button
                          key={repo}
                          type="button"
                          onClick={() =>
                            setValues((prev) => ({
                              ...prev,
                              [REPO_INPUT_KEY]: repo,
                            }))
                          }
                          className="mr-1.5 rounded-md bg-[var(--console-panel)] px-2 py-1 text-[11px] text-[var(--console-ink)] transition hover:bg-[var(--console-line)]"
                        >
                          Use <code>{repo}</code>
                        </button>
                      ))
                    : null}
                </label>
              );
            })}
          </>
        ) : (
          <dl className="space-y-2">
            {(shownFlow ? proposalFields(shownFlow) : []).map((field) => {
              const value = (
                (open ? values : proposal.inputs)[field.key] ?? ""
              ).trim();
              if (!value) return null;
              return (
                <div key={field.key}>
                  <dt className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--console-faint)]">
                    {field.label}
                  </dt>
                  <dd className="mt-0.5 line-clamp-6 whitespace-pre-wrap text-[13px] text-[var(--console-ink)]">
                    {value}
                  </dd>
                </div>
              );
            })}
          </dl>
        )}

        {error ? (
          <p className="rounded-md bg-red-50 px-2.5 py-1.5 text-[12px] text-red-700">
            {error}
          </p>
        ) : null}

        {open ? (
          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1 border-[var(--console-line)] text-[12px]"
              onClick={dismiss}
              disabled={Boolean(busy)}
            >
              {busy === "dismiss" ? (
                <Loader2 className="size-3 animate-spin" aria-hidden />
              ) : (
                <X className="size-3" aria-hidden />
              )}
              Dismiss
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 gap-1 bg-[var(--console-ink)] text-[12px] text-white hover:bg-[var(--console-accent)]"
              onClick={start}
              disabled={!complete || Boolean(busy)}
              title={complete ? undefined : "Fill in the required fields first"}
            >
              {busy === "start" ? (
                <Loader2 className="size-3 animate-spin" aria-hidden />
              ) : (
                <Play className="size-3" aria-hidden />
              )}
              Start
            </Button>
          </div>
        ) : null}

        {proposal.state === "starting" ? (
          <p className="flex items-center gap-2 text-[12px] text-[var(--console-muted)]">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
            Starting…
          </p>
        ) : null}

        {proposal.state === "confirmed" ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--console-panel)] px-3 py-2">
            <p className="flex min-w-0 items-center gap-2 text-[12px] text-[var(--console-ink)]">
              {live ? (
                <LiveDot className="text-[var(--console-accent)]" />
              ) : (
                <CheckCircle2
                  className="size-3.5 shrink-0 text-[var(--console-accent)]"
                  aria-hidden
                />
              )}
              <span className="truncate">
                {item
                  ? `${item.stage_name} · ${statusLabel(item)}`
                  : "Started — work item no longer exists"}
              </span>
            </p>
            {item ? (
              <Link
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-0.5 text-[12px] font-medium",
                  "text-[var(--console-accent)] hover:text-[var(--console-accent-hover)]",
                )}
              >
                Open work item
                <ArrowUpRight className="size-3" aria-hidden />
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
