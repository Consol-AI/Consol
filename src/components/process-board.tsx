"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bot,
  Check,
  CheckCircle2,
  GitBranch,
  Loader2,
  Plus,
  ScrollText,
  ShieldCheck,
  Terminal,
  X,
} from "lucide-react";
import {
  advanceWorkItemAction,
  createWorkItemAction,
  moveWorkItemAction,
} from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { parseStageConfig } from "@/lib/flows/stage-config";
import type { Stage, StageTransition, WorkItem } from "@/lib/factory";
import { cn } from "@/lib/utils";

type Props = {
  productId: string;
  processId: string;
  stages: Stage[];
  items: WorkItem[];
  transitions: StageTransition[];
  flowBacked: boolean;
};

function stageMeta(type: string): {
  label: string;
  icon: typeof Bot;
  badgeClass: string;
  railClass: string;
} {
  if (type === "agent") {
    return {
      label: "Agent",
      icon: Bot,
      badgeClass:
        "border-transparent bg-[var(--console-accent-soft)] text-[var(--console-accent)]",
      railClass: "bg-[var(--console-accent)]",
    };
  }
  if (type === "human") {
    return {
      label: "Human gate",
      icon: ShieldCheck,
      badgeClass: "border-transparent bg-amber-50 text-amber-800",
      railClass: "bg-amber-500",
    };
  }
  if (type === "script") {
    return {
      label: "Script",
      icon: Terminal,
      badgeClass: "border-transparent bg-slate-100 text-slate-700",
      railClass: "bg-slate-500",
    };
  }
  return {
    label: "Stage",
    icon: GitBranch,
    badgeClass: "border-transparent bg-[var(--console-panel)] text-[var(--console-muted)]",
    railClass: "bg-[var(--console-faint)]",
  };
}

export function ProcessBoard({
  productId,
  processId,
  stages,
  items,
  transitions,
  flowBacked,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const formData = new FormData();
    formData.set("processId", processId);
    formData.set("stageId", stages[0]?.id ?? "");
    formData.set("title", title);
    formData.set("body", body);
    startTransition(async () => {
      try {
        await createWorkItemAction(formData);
        setTitle("");
        setBody("");
        router.refresh();
      } catch {
        setError("Could not create work item.");
      }
    });
  }

  function onMove(itemId: string, stageId: string) {
    setError(null);
    setNotice(null);
    setBusyItemId(itemId);
    const formData = new FormData();
    formData.set("itemId", itemId);
    formData.set("stageId", stageId);
    startTransition(async () => {
      try {
        await moveWorkItemAction(formData);
        router.refresh();
      } catch {
        setError("That move is not allowed by this flow.");
      } finally {
        setBusyItemId(null);
      }
    });
  }

  function onAdvance(
    itemId: string,
    outcome: string,
    options?: { execute?: boolean },
  ) {
    setError(null);
    setNotice(null);
    setBusyItemId(itemId);
    const formData = new FormData();
    formData.set("itemId", itemId);
    formData.set("outcome", outcome);
    if (options?.execute) formData.set("execute", "1");
    startTransition(async () => {
      try {
        const result = await advanceWorkItemAction(formData);
        setNotice(result.summary);
        router.refresh();
      } catch {
        setError("Could not advance this work item.");
      } finally {
        setBusyItemId(null);
      }
    });
  }

  function legalTargets(stage: Stage): Stage[] {
    if (!flowBacked) {
      return stages.filter((s) => s.id !== stage.id);
    }
    const fromKey = stage.stage_key || stage.id;
    const keys = new Set(
      transitions
        .filter((t) => t.from_stage_key === fromKey)
        .map((t) => t.to_stage_key)
        .filter((key) => key !== "done"),
    );
    return stages.filter((s) => keys.has(s.stage_key || s.id));
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={onCreate}
        className="overflow-hidden rounded-xl bg-[var(--console-surface)] shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)]"
      >
        <div className="flex items-center gap-2 border-b border-[var(--console-line)] px-4 py-3">
          <ScrollText className="size-3.5 text-[var(--console-accent)]" />
          <p className="text-[13px] font-semibold text-[var(--console-ink)]">
            New work item
          </p>
          {flowBacked ? (
            <Badge
              variant="outline"
              className="ml-auto h-5 border-[var(--console-line)] bg-[var(--console-panel)] text-[10px] text-[var(--console-muted)]"
            >
              Starts at entry stage
            </Badge>
          ) : null}
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-[1.1fr_1.4fr_auto] md:items-end">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[var(--console-muted)]">
              Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to move through this flow?"
              required
              className="h-9 border-[var(--console-line)] bg-white text-[13px] shadow-none focus-visible:border-[var(--console-accent)] focus-visible:ring-[var(--console-accent-ring)]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-[var(--console-muted)]">
              Brief
            </label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Acceptance criteria, context, links…"
              className="min-h-9 resize-none border-[var(--console-line)] bg-white text-[13px] shadow-none focus-visible:border-[var(--console-accent)] focus-visible:ring-[var(--console-accent-ring)]"
            />
          </div>
          <Button
            type="submit"
            disabled={pending || !title.trim()}
            className="h-9 gap-1.5 bg-[var(--console-ink)] text-[13px] text-white hover:bg-[var(--console-accent)]"
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
            Add item
          </Button>
        </div>
        {error || notice ? (
          <div
            className={cn(
              "border-t px-4 py-2.5 text-[12px]",
              error
                ? "border-red-100 bg-red-50 text-red-700"
                : "border-[var(--console-line)] bg-[var(--console-accent-soft)] text-[var(--console-accent)]",
            )}
          >
            {error ?? notice}
          </div>
        ) : null}
      </form>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--console-line)] bg-[var(--console-surface)] px-6 py-16 text-center shadow-[var(--console-shadow)]">
          <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-[var(--console-accent-soft)] text-[var(--console-accent)]">
            <GitBranch className="size-4" />
          </div>
          <p className="text-[15px] font-semibold tracking-tight text-[var(--console-ink)]">
            Empty board
          </p>
          <p className="mt-1 max-w-sm text-[13px] text-[var(--console-muted)]">
            Add the first work item to start this lifecycle. Flow-backed boards
            advance through agent runs, human gates, and scripts.
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
                      No items here
                    </div>
                  ) : (
                    columnItems.map((item) => {
                      const busy = pending && busyItemId === item.id;
                      const done = item.status === "done";
                      return (
                        <article
                          key={item.id}
                          className={cn(
                            "group rounded-lg bg-white p-3 shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)] transition hover:ring-[var(--console-accent)]/30",
                            busy && "opacity-70",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              href={`/app/products/${productId}/processes/${processId}?item=${item.id}`}
                              className="text-[13px] font-medium leading-snug text-[var(--console-ink)] transition hover:text-[var(--console-accent)]"
                            >
                              {item.title}
                            </Link>
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

                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {flowBacked && stage.stage_type === "agent" ? (
                              <Button
                                type="button"
                                size="xs"
                                disabled={busy || done}
                                onClick={() =>
                                  onAdvance(item.id, "done", { execute: true })
                                }
                                className="h-7 gap-1 bg-[var(--console-accent)] text-[11px] text-white hover:bg-[var(--console-accent-hover)]"
                              >
                                {busy ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <Bot className="size-3" />
                                )}
                                Run agent
                              </Button>
                            ) : null}

                            {flowBacked && stage.stage_type === "script" ? (
                              <Button
                                type="button"
                                size="xs"
                                disabled={busy || done}
                                onClick={() =>
                                  onAdvance(item.id, "success", {
                                    execute: true,
                                  })
                                }
                                className="h-7 gap-1 bg-slate-800 text-[11px] text-white hover:bg-slate-700"
                              >
                                {busy ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <Terminal className="size-3" />
                                )}
                                Run script
                              </Button>
                            ) : null}

                            {flowBacked && stage.stage_type === "human" ? (
                              <>
                                <Button
                                  type="button"
                                  size="xs"
                                  disabled={busy || done}
                                  onClick={() => onAdvance(item.id, "approve")}
                                  className="h-7 gap-1 bg-[var(--console-ink)] text-[11px] text-white hover:bg-[var(--console-accent)]"
                                >
                                  {busy ? (
                                    <Loader2 className="size-3 animate-spin" />
                                  ) : (
                                    <Check className="size-3" />
                                  )}
                                  Approve
                                </Button>
                                <Button
                                  type="button"
                                  size="xs"
                                  variant="outline"
                                  disabled={busy || done}
                                  onClick={() => onAdvance(item.id, "reject")}
                                  className="h-7 gap-1 border-[var(--console-line)] bg-white text-[11px] text-[var(--console-muted)] hover:bg-[var(--console-hover)] hover:text-[var(--console-ink)]"
                                >
                                  <X className="size-3" />
                                  Reject
                                </Button>
                              </>
                            ) : null}

                            {!flowBacked
                              ? legalTargets(stage).map((s) => (
                                  <Button
                                    key={s.id}
                                    type="button"
                                    size="xs"
                                    variant="outline"
                                    disabled={busy}
                                    onClick={() => onMove(item.id, s.id)}
                                    className="h-7 border-[var(--console-line)] bg-white text-[11px] text-[var(--console-muted)] hover:border-[var(--console-accent)] hover:text-[var(--console-accent)]"
                                  >
                                    → {s.name}
                                  </Button>
                                ))
                              : null}
                          </div>
                        </article>
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
