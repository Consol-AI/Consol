"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, ScrollText } from "lucide-react";
import { createWorkItemAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  processId: string;
  entryStageId: string;
};

export function CreateIssueForm({ processId, entryStageId }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const formData = new FormData();
    formData.set("processId", processId);
    formData.set("stageId", entryStageId);
    formData.set("title", title);
    formData.set("body", body);
    startTransition(async () => {
      try {
        await createWorkItemAction(formData);
        setTitle("");
        setBody("");
        router.refresh();
      } catch {
        setError("Could not create issue.");
      }
    });
  }

  return (
    <form
      onSubmit={onCreate}
      className="overflow-hidden rounded-xl bg-[var(--console-surface)] shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)]"
    >
      <div className="flex items-center gap-2 border-b border-[var(--console-line)] px-4 py-3">
        <ScrollText className="size-3.5 text-[var(--console-accent)]" />
        <p className="text-[13px] font-semibold text-[var(--console-ink)]">
          New issue
        </p>
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
          Add issue
        </Button>
      </div>
      {error ? (
        <div className="border-t border-red-100 bg-red-50 px-4 py-2.5 text-[12px] text-red-700">
          {error}
        </div>
      ) : null}
    </form>
  );
}
