"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { TeammateRecord } from "@/lib/teammates/types";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  source?: "agent-sdk" | "mock";
};

export function TeammateChat({
  teammate,
  starterPrompt,
}: {
  teammate: TeammateRecord;
  starterPrompt: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState(starterPrompt);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [continuationToken, setContinuationToken] = useState<string | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  function send(contentOverride?: string) {
    const content = (contentOverride ?? draft).trim();
    if (!content || pending) return;
    setError(null);
    setDraft("");
    const optimistic: ChatMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      content,
    };
    setMessages((prev) => [...prev, optimistic]);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/teammates/${teammate.slug}/chat`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            message: content,
            sessionId,
            continuationToken,
          }),
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          throw new Error(detail || "Chat request failed");
        }
        const data = (await res.json()) as {
          reply: string;
          source: "agent-sdk" | "mock";
          sessionId?: string;
          continuationToken?: string;
        };
        if (data.sessionId) setSessionId(data.sessionId);
        if (data.continuationToken) setContinuationToken(data.continuationToken);
        setMessages((prev) => [
          ...prev,
          {
            id: `a_${Date.now()}`,
            role: "assistant",
            content: data.reply,
            source: data.source,
          },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chat failed");
      }
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-start justify-between gap-4 border-b border-[var(--console-line)] px-5 py-4 md:px-8">
        <div className="animate-rise min-w-0">
          <p className="text-[12px] text-[var(--console-faint)]">
            <Link
              href="/app/teammates"
              className="hover:text-[var(--console-ink)]"
            >
              Teammates
            </Link>
            <span className="mx-1.5">/</span>
            {teammate.slug}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-[var(--console-agent)] text-[var(--console-accent)]">
              <Bot className="size-3.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-[18px] font-semibold tracking-tight text-[var(--console-ink)]">
                {teammate.name}
              </h1>
              <p className="truncate text-[12px] text-[var(--console-muted)]">
                {teammate.role} · {teammate.status} · port {teammate.port}
              </p>
            </div>
          </div>
        </div>
        <p className="hidden max-w-[220px] text-right text-[11px] leading-relaxed text-[var(--console-faint)] md:block">
          Live turns need{" "}
          <code className="text-[10px]">
            npm run agents:serve -- {teammate.slug}
          </code>
        </p>
      </header>

      <ScrollArea className="flex-1 px-5 py-4 md:px-8">
        <div className="mx-auto flex max-w-[720px] flex-col gap-3">
          {messages.length === 0 ? (
            <div className="rounded-xl bg-[var(--console-surface)] px-4 py-5 ring-1 ring-[var(--console-line)]">
              <p className="text-[13px] font-medium text-[var(--console-ink)]">
                First message
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-[var(--console-muted)]">
                {teammate.presetId
                  ? "Send a starter task for this role, or edit the draft below."
                  : "Brief this blank teammate: job, sources, output, and approval stops."}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-3 h-8 rounded-md border-[var(--console-line)] text-[12px]"
                onClick={() => send(starterPrompt)}
                disabled={pending}
              >
                Send starter prompt
              </Button>
            </div>
          ) : null}

          {messages.map((m) => (
            <div
              key={m.id}
              className={
                m.role === "user"
                  ? "ml-8 rounded-xl bg-[var(--console-ink)] px-3.5 py-2.5 text-[13px] text-white"
                  : "mr-8 rounded-xl bg-[var(--console-surface)] px-3.5 py-2.5 text-[13px] text-[var(--console-ink)] ring-1 ring-[var(--console-line)]"
              }
            >
              <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.06em] opacity-60">
                {m.role === "user"
                  ? "You"
                  : `${teammate.name}${m.source === "mock" ? " · mock" : ""}`}
              </p>
              <div className="whitespace-pre-wrap leading-relaxed">
                {m.content}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="border-t border-[var(--console-line)] bg-[var(--console-surface)] px-5 py-3 md:px-8">
        <div className="mx-auto flex max-w-[720px] flex-col gap-2">
          {error ? <p className="text-[12px] text-red-600">{error}</p> : null}
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Message ${teammate.name}…`}
            className="min-h-20 resize-none rounded-md border-[var(--console-line)] bg-white text-[13px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-[var(--console-faint)]">
              ⌘/Ctrl + Enter to send
            </p>
            <Button
              type="button"
              size="sm"
              className="h-8 rounded-md bg-[var(--console-ink)] text-[12px] text-white hover:bg-[var(--console-accent)]"
              disabled={pending || !draft.trim()}
              onClick={() => send()}
            >
              {pending ? "Sending…" : "Send"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
