"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  advanceWorkItemAction,
  createWorkItemAction,
  moveWorkItemAction,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { parseStageConfig } from "@/lib/flows/stage-config";
import type { Stage, StageTransition, WorkItem } from "@/lib/factory";

type Props = {
  productId: string;
  processId: string;
  stages: Stage[];
  items: WorkItem[];
  transitions: StageTransition[];
  flowBacked: boolean;
};

function stageTypeLabel(type: string): string {
  if (type === "agent") return "Agent";
  if (type === "human") return "Human gate";
  if (type === "script") return "Script";
  return "Stage";
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
    const formData = new FormData();
    formData.set("itemId", itemId);
    formData.set("stageId", stageId);
    startTransition(async () => {
      try {
        await moveWorkItemAction(formData);
        router.refresh();
      } catch {
        setError("That move is not allowed by this flow.");
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
    <div className="space-y-6">
      <form
        onSubmit={onCreate}
        className="grid gap-3 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4 md:grid-cols-[1fr_1fr_auto]"
      >
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New work item title"
          required
        />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Optional brief"
          className="min-h-10 resize-none"
        />
        <Button type="submit" disabled={pending || !title.trim()}>
          {pending ? "Adding…" : "Add item"}
        </Button>
        {error ? (
          <p className="text-sm text-red-700 md:col-span-3">{error}</p>
        ) : null}
        {notice ? (
          <p className="text-sm text-[var(--quiet)] md:col-span-3">{notice}</p>
        ) : null}
      </form>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--line)] px-6 py-12 text-center">
          <p className="font-[family-name:var(--font-display)] text-xl">
            Empty board
          </p>
          <p className="mt-2 text-sm text-[var(--quiet)]">
            Add the first work item to start this lifecycle.
          </p>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {stages.map((stage) => {
            const columnItems = items.filter((i) => i.stage_id === stage.id);
            const config = parseStageConfig(stage.config);
            return (
              <section
                key={stage.id}
                className="min-w-[16rem] flex-1 rounded-lg border border-[var(--line)] bg-[var(--panel)]"
              >
                <header className="border-b border-[var(--line)] px-3 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-medium tracking-tight">{stage.name}</h3>
                    <span className="text-[10px] uppercase tracking-[0.08em] text-[var(--quiet)]">
                      {stageTypeLabel(stage.stage_type)}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--quiet)]">
                    {stage.description}
                  </p>
                  {stage.stage_type === "human" ? (
                    <p className="mt-1 text-xs text-[var(--quiet)]">
                      {String(config.responsible ?? "")} · approves{" "}
                      {String(config.approves ?? "")}
                    </p>
                  ) : null}
                </header>
                <div className="space-y-2 p-2">
                  {columnItems.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/app/products/${productId}/processes/${processId}?item=${item.id}`}
                          className="font-medium hover:underline"
                        >
                          {item.title}
                        </Link>
                        {item.status === "done" ? (
                          <span className="text-[10px] uppercase tracking-[0.08em] text-[var(--quiet)]">
                            Done
                          </span>
                        ) : null}
                      </div>
                      {item.body ? (
                        <p className="mt-1 line-clamp-3 text-sm text-[var(--quiet)]">
                          {item.body}
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-1">
                        {flowBacked && stage.stage_type === "agent" ? (
                          <button
                            type="button"
                            className="rounded border border-[var(--ink)] bg-[var(--ink)] px-2 py-0.5 text-xs text-[var(--surface)]"
                            onClick={() =>
                              onAdvance(item.id, "done", { execute: true })
                            }
                            disabled={pending || item.status === "done"}
                          >
                            Run agent →
                          </button>
                        ) : null}
                        {flowBacked && stage.stage_type === "script" ? (
                          <button
                            type="button"
                            className="rounded border border-[var(--ink)] bg-[var(--ink)] px-2 py-0.5 text-xs text-[var(--surface)]"
                            onClick={() =>
                              onAdvance(item.id, "success", { execute: true })
                            }
                            disabled={pending || item.status === "done"}
                          >
                            Run script
                          </button>
                        ) : null}
                        {flowBacked && stage.stage_type === "human" ? (
                          <>
                            <button
                              type="button"
                              className="rounded border border-[var(--ink)] bg-[var(--ink)] px-2 py-0.5 text-xs text-[var(--surface)]"
                              onClick={() => onAdvance(item.id, "approve")}
                              disabled={pending || item.status === "done"}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="rounded border border-[var(--line)] px-2 py-0.5 text-xs text-[var(--quiet)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
                              onClick={() => onAdvance(item.id, "reject")}
                              disabled={pending || item.status === "done"}
                            >
                              Reject
                            </button>
                          </>
                        ) : null}
                        {!flowBacked
                          ? legalTargets(stage).map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                className="rounded border border-[var(--line)] px-2 py-0.5 text-xs text-[var(--quiet)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
                                onClick={() => onMove(item.id, s.id)}
                                disabled={pending}
                              >
                                → {s.name}
                              </button>
                            ))
                          : null}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
