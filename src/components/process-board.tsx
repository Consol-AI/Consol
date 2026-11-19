"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createWorkItemAction,
  moveWorkItemAction,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Stage, WorkItem } from "@/lib/factory";

type Props = {
  productId: string;
  processId: string;
  stages: Stage[];
  items: WorkItem[];
};

export function ProcessBoard({ productId, processId, stages, items }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
    const formData = new FormData();
    formData.set("itemId", itemId);
    formData.set("stageId", stageId);
    startTransition(async () => {
      await moveWorkItemAction(formData);
      router.refresh();
    });
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
            return (
              <section
                key={stage.id}
                className="min-w-[16rem] flex-1 rounded-lg border border-[var(--line)] bg-[var(--panel)]"
              >
                <header className="border-b border-[var(--line)] px-3 py-3">
                  <h3 className="font-medium tracking-tight">{stage.name}</h3>
                  <p className="text-xs text-[var(--quiet)]">
                    {stage.description}
                  </p>
                </header>
                <div className="space-y-2 p-2">
                  {columnItems.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-md border border-[var(--line)] bg-[var(--surface)] p-3"
                    >
                      <Link
                        href={`/app/products/${productId}/processes/${processId}?item=${item.id}`}
                        className="font-medium hover:underline"
                      >
                        {item.title}
                      </Link>
                      {item.body ? (
                        <p className="mt-1 line-clamp-3 text-sm text-[var(--quiet)]">
                          {item.body}
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-1">
                        {stages
                          .filter((s) => s.id !== stage.id)
                          .map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              className="rounded border border-[var(--line)] px-2 py-0.5 text-xs text-[var(--quiet)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
                              onClick={() => onMove(item.id, s.id)}
                              disabled={pending}
                            >
                              → {s.name}
                            </button>
                          ))}
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
