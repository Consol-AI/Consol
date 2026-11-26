"use client";

import { useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/markdown";
import {
  ModelPicker,
  usePreferredModelRef,
} from "@/components/model-picker";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Message } from "@/lib/factory";
import type { ModelOption } from "@/lib/models";
import { cn } from "@/lib/utils";

/** Long agent drafts get clamped so the thread stays scannable. */
function CollapsibleMarkdown({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  const long = content.length > 600;
  return (
    <div>
      <div
        className={cn(
          long && !open && "max-h-40 overflow-hidden [mask-image:linear-gradient(to_bottom,black_60%,transparent)]",
        )}
      >
        <Markdown>{content}</Markdown>
      </div>
      {long ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-1 text-[11px] font-medium text-[var(--console-accent)] hover:underline"
        >
          {open ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}

type Props = {
  processId: string;
  workItemId?: string;
  initialMessages: Message[];
  title?: string;
  /** When true, omit outer chrome (parent supplies header/surface). */
  embedded?: boolean;
  modelOptions?: ModelOption[];
  defaultModelRef?: string | null;
};

export function AiPanel({
  processId,
  workItemId,
  initialMessages,
  title = "AI collaborator",
  embedded = false,
  modelOptions = [],
  defaultModelRef = null,
}: Props) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [modelRef, setModelRef] = usePreferredModelRef(
    modelOptions,
    defaultModelRef,
  );

  function send() {
    const content = draft.trim();
    if (!content || pending) return;
    setError(null);
    setDraft("");
    const optimistic: Message = {
      id: `tmp_${Date.now()}`,
      organization_id: null,
      process_id: processId,
      work_item_id: workItemId ?? null,
      role: "user",
      content,
      author_sub: null,
      author_name: "You",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    startTransition(async () => {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            message: content,
            processId,
            workItemId,
            model: modelRef || undefined,
          }),
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          throw new Error(detail || "AI request failed");
        }
        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          const data = (await res.json()) as { reply: string };
          setMessages((prev) => [
            ...prev,
            {
              id: `tmp_ai_${Date.now()}`,
              organization_id: null,
              process_id: processId,
              work_item_id: workItemId ?? null,
              role: "assistant",
              content: data.reply,
              author_sub: null,
              author_name: "Forge AI",
              created_at: new Date().toISOString(),
            },
          ]);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No stream");
        const decoder = new TextDecoder();
        let text = "";
        const streamId = `tmp_ai_${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          {
            id: streamId,
            organization_id: null,
            process_id: processId,
            work_item_id: workItemId ?? null,
            role: "assistant",
            content: "",
            author_sub: null,
            author_name: "Forge AI",
            created_at: new Date().toISOString(),
          },
        ]);
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
          const snapshot = text;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === streamId ? { ...m, content: snapshot } : m,
            ),
          );
        }
      } catch (err) {
        const message =
          err instanceof Error && err.message
            ? err.message
            : "Could not reach the AI assistant. Try again.";
        setError(message.slice(0, 240));
      }
    });
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-[28rem] flex-col",
        !embedded &&
          "overflow-hidden rounded-xl bg-[var(--console-surface)] shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)]",
      )}
    >
      {!embedded ? (
        <div className="border-b border-[var(--console-line)] px-4 py-3">
          <p className="text-[13px] font-semibold text-[var(--console-ink)]">
            {title}
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--console-muted)]">
            Shared with your team — ask for next steps, briefs, or critiques.
          </p>
        </div>
      ) : (
        <div className="border-b border-[var(--console-line)] px-4 py-2.5">
          <p className="text-[12px] text-[var(--console-muted)]">
            Ask for next steps, briefs, or critiques on this process.
          </p>
        </div>
      )}
      <ScrollArea className="min-h-0 flex-1 px-4 py-3">
        <div className="space-y-2.5">
          {messages.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--console-line)] bg-[var(--console-panel)]/60 px-3 py-6 text-center">
              <p className="text-[12px] text-[var(--console-muted)]">
                No messages yet. Ask Forge to draft a brief, challenge a
                prioritization, or outline analysis questions.
              </p>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "rounded-lg px-3 py-2.5",
                  m.role === "assistant"
                    ? "bg-[var(--console-accent-soft)] ring-1 ring-[var(--console-accent)]/10"
                    : m.role === "system"
                      ? "bg-[var(--console-panel)] text-[var(--console-muted)]"
                      : "bg-white ring-1 ring-[var(--console-line)]",
                )}
              >
                <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--console-faint)]">
                  {m.role === "assistant"
                    ? "Forge AI"
                    : m.role === "system"
                      ? m.author_name || "Flow"
                      : m.author_name || "Teammate"}
                </p>
                {m.role === "user" ? (
                  <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--console-ink)]">
                    {m.content}
                  </p>
                ) : (
                  <CollapsibleMarkdown content={m.content} />
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      <div className="space-y-2 border-t border-[var(--console-line)] bg-white p-3">
        {error ? (
          <p className="rounded-md bg-red-50 px-2.5 py-1.5 text-[12px] text-red-700">
            {error}
          </p>
        ) : null}
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about this work…"
          className="min-h-20 resize-none border-[var(--console-line)] bg-[var(--console-panel)]/40 text-[13px] shadow-none focus-visible:border-[var(--console-accent)] focus-visible:ring-[var(--console-accent-ring)]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              send();
            }
          }}
        />
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {modelOptions.length > 0 ? (
              <ModelPicker
                options={modelOptions}
                defaultRef={defaultModelRef}
                value={modelRef}
                onChange={setModelRef}
                compact
              />
            ) : (
              <p className="text-[11px] text-[var(--console-faint)]">
                ⌘/Ctrl + Enter
              </p>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            onClick={send}
            disabled={pending || !draft.trim()}
            className="h-8 gap-1.5 bg-[var(--console-ink)] text-[12px] text-white hover:bg-[var(--console-accent)]"
          >
            {pending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
            {pending ? "Thinking…" : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
