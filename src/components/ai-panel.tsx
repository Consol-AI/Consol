"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Message } from "@/lib/factory";

type Props = {
  processId: string;
  workItemId?: string;
  initialMessages: Message[];
  title?: string;
};

export function AiPanel({
  processId,
  workItemId,
  initialMessages,
  title = "AI collaborator",
}: Props) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function send() {
    const content = draft.trim();
    if (!content || pending) return;
    setError(null);
    setDraft("");
    const optimistic: Message = {
      id: `tmp_${Date.now()}`,
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
          body: JSON.stringify({ message: content, processId, workItemId }),
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
          setMessages((prev) =>
            prev.map((m) => (m.id === streamId ? { ...m, content: text } : m)),
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
    <div className="flex h-full min-h-[28rem] flex-col border-l border-[var(--line)] bg-[var(--panel)]">
      <div className="border-b border-[var(--line)] px-4 py-3">
        <p className="font-[family-name:var(--font-display)] text-lg tracking-tight">
          {title}
        </p>
        <p className="text-sm text-[var(--quiet)]">
          Shared with your team — ask for next steps, briefs, or critiques.
        </p>
      </div>
      <ScrollArea className="flex-1 px-4 py-3">
        <div className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-[var(--quiet)]">
              No messages yet. Ask Forge to draft a brief, challenge a
              prioritization, or outline analysis questions.
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "assistant"
                    ? "rounded-md bg-[var(--surface)] px-3 py-2"
                    : "rounded-md px-1 py-1"
                }
              >
                <p className="mb-1 text-xs uppercase tracking-wide text-[var(--quiet)]">
                  {m.role === "assistant"
                    ? "Forge AI"
                    : m.author_name || "Teammate"}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {m.content}
                </p>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      <div className="space-y-2 border-t border-[var(--line)] p-3">
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about this work…"
          className="min-h-20 resize-none bg-[var(--surface)]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              send();
            }
          }}
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-[var(--quiet)]">⌘/Ctrl + Enter</p>
          <Button type="button" onClick={send} disabled={pending || !draft.trim()}>
            {pending ? "Thinking…" : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
