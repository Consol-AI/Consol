"use client";

import { Markdown } from "@/components/markdown";
import Link from "next/link";
import { LiveDot } from "@/components/live-dot";
import { useState, useTransition } from "react";
import {
  ArrowUpRight,
  Loader2,
  MessageSquareText,
  Send,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Message, WorkspaceAttentionItem } from "@/lib/factory";
import { workItemHref } from "@/lib/work-links";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "What needs my decision today?",
  "Ship: add a subtle footer changelog link",
  "Summarize open work across flows",
  "Help me prioritize what to ship next",
] as const;

let tempMessageSeq = 0;
/** Client-only id for optimistic messages until the server echoes them. */
function tempMessageId(prefix: string): string {
  tempMessageSeq += 1;
  return `${prefix}_${tempMessageSeq}`;
}

type Props = {
  organizationId: string;
  orgName: string;
  initialMessages: Message[];
  attention: WorkspaceAttentionItem[];
  needsYou: number;
  agentsWorking: number;
};

export function HomeChat({
  organizationId,
  orgName,
  initialMessages,
  attention,
  needsYou,
  agentsWorking,
}: Props) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deliveryConfirm, setDeliveryConfirm] = useState<{
    title: string;
    body: string;
    repo: string | null;
  } | null>(null);
  const [lastDeliveryHref, setLastDeliveryHref] = useState<string | null>(null);

  function send(
    contentOverride?: string,
    options?: {
      confirmDelivery?: boolean;
      deliveryTitle?: string;
      deliveryBody?: string;
      deliveryRepo?: string | null;
    },
  ) {
    const content = (contentOverride ?? draft).trim();
    if (!content || pending) return;
    setError(null);
    setDraft("");
    const optimistic: Message = {
      id: tempMessageId("tmp"),
      organization_id: organizationId,
      process_id: null,
      work_item_id: null,
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
            organizationId,
            confirmDelivery: options?.confirmDelivery,
            deliveryTitle: options?.deliveryTitle,
            deliveryBody: options?.deliveryBody,
            deliveryRepo: options?.deliveryRepo ?? undefined,
          }),
        });
        if (!res.ok) {
          const detail = await res.text().catch(() => "");
          throw new Error(detail || "AI request failed");
        }
        const contentType = res.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          const data = (await res.json()) as {
            reply: string;
            delivery?: {
              started?: boolean;
              needsConfirm?: boolean;
              href?: string;
              title?: string;
              body?: string;
              repo?: string | null;
            };
          };
          if (data.delivery?.needsConfirm && data.delivery.title) {
            setDeliveryConfirm({
              title: data.delivery.title,
              body: data.delivery.body || content,
              repo: data.delivery.repo ?? null,
            });
          } else {
            setDeliveryConfirm(null);
          }
          if (data.delivery?.started && data.delivery.href) {
            setLastDeliveryHref(data.delivery.href);
          }
          setMessages((prev) => [
            ...prev,
            {
              id: tempMessageId("tmp_ai"),
              organization_id: organizationId,
              process_id: null,
              work_item_id: null,
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
        const streamId = tempMessageId("tmp_ai");
        setMessages((prev) => [
          ...prev,
          {
            id: streamId,
            organization_id: organizationId,
            process_id: null,
            work_item_id: null,
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
            : "Could not reach Forge. Try again.";
        setError(message.slice(0, 240));
      }
    });
  }

  const spotlight = attention.slice(0, 4);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-start justify-between gap-4 border-b border-[var(--console-line)] px-5 py-4 md:px-8">
        <div className="animate-rise min-w-0">
          <p className="text-[12px] text-[var(--console-faint)]">{orgName}</p>
          <div className="mt-1 flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-full bg-[var(--console-agent)] text-[var(--console-accent)]">
              <Sparkles className="size-3.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h1 className="text-[18px] font-semibold tracking-tight text-[var(--console-ink)]">
                Forge
              </h1>
              <p className="text-[12px] text-[var(--console-muted)]">
                Coordinate tasks and decisions across the factory
              </p>
            </div>
          </div>
        </div>
        <div className="animate-rise-delay hidden shrink-0 items-center gap-3 text-[11px] text-[var(--console-faint)] sm:flex">
          <span>
            {needsYou} need you · {agentsWorking} agents
          </span>
          <Link
            href="/app/work"
            className="inline-flex items-center gap-0.5 font-medium text-[var(--console-accent)] hover:text-[var(--console-accent-hover)]"
          >
            Work
            <ArrowUpRight className="size-3" aria-hidden />
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ScrollArea className="flex-1 px-5 py-4 md:px-8">
            <div className="mx-auto flex max-w-[720px] flex-col gap-3">
              {messages.length === 0 ? (
                <div className="animate-rise rounded-xl bg-[var(--console-surface)] px-4 py-5 ring-1 ring-[var(--console-line)]">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--console-panel)] text-[var(--console-muted)]">
                      <MessageSquareText className="size-3.5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-[var(--console-ink)]">
                        Ask Forge to coordinate
                      </p>
                      <p className="mt-1 text-[12px] leading-relaxed text-[var(--console-muted)]">
                        Clear decisions, prioritize open work, brief a new
                        initiative, or steer agent stages — one thread for the
                        whole floor.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {SUGGESTIONS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        disabled={pending}
                        onClick={() => send(prompt)}
                        className="rounded-md bg-[var(--console-panel)] px-2.5 py-1.5 text-left text-[12px] text-[var(--console-ink)] transition hover:bg-[var(--console-line)] disabled:opacity-50"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                    m.role === "user"
                      ? "ml-8 bg-[var(--console-ink)] text-white"
                      : "mr-8 bg-[var(--console-surface)] text-[var(--console-ink)] ring-1 ring-[var(--console-line)]",
                  )}
                >
                  <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.06em] opacity-60">
                    {m.role === "user" ? "You" : "Forge"}
                  </p>
                  {m.role === "user" ? (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  ) : (
                    <Markdown>{m.content}</Markdown>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="border-t border-[var(--console-line)] bg-[var(--console-surface)] px-5 py-3 md:px-8">
            <div className="mx-auto flex max-w-[720px] flex-col gap-2">
              {error ? (
                <p className="rounded-md bg-red-50 px-2.5 py-1.5 text-[12px] text-red-700">
                  {error}
                </p>
              ) : null}
              {deliveryConfirm ? (
                <div className="flex flex-wrap items-center gap-2 rounded-md bg-[var(--console-accent-soft)] px-2.5 py-2 text-[12px] text-[var(--console-accent)]">
                  <span className="min-w-0 flex-1">
                    Start delivery for <strong>{deliveryConfirm.title}</strong>
                    {deliveryConfirm.repo ? (
                      <> on <code>{deliveryConfirm.repo}</code></>
                    ) : null}
                    ?
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    className="h-7"
                    disabled={pending}
                    onClick={() =>
                      send(`Start software delivery: ${deliveryConfirm.title}`, {
                        confirmDelivery: true,
                        deliveryTitle: deliveryConfirm.title,
                        deliveryBody: deliveryConfirm.body,
                        deliveryRepo: deliveryConfirm.repo,
                      })
                    }
                  >
                    Confirm start
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7"
                    disabled={pending}
                    onClick={() => setDeliveryConfirm(null)}
                  >
                    Dismiss
                  </Button>
                </div>
              ) : null}
              {lastDeliveryHref ? (
                <p className="text-[12px] text-[var(--console-muted)]">
                  Latest delivery:{" "}
                  <Link
                    href={lastDeliveryHref}
                    className="font-medium text-[var(--console-accent)] hover:underline"
                  >
                    Open work item
                  </Link>
                </p>
              ) : null}
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask Forge to coordinate a task or decision…"
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
                  onClick={() => send()}
                  disabled={pending || !draft.trim()}
                  className="h-8 gap-1.5 rounded-md bg-[var(--console-ink)] text-[12px] text-white hover:bg-[var(--console-accent)]"
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
        </div>

        <aside className="hidden w-[280px] shrink-0 flex-col border-l border-[var(--console-line)] bg-[var(--console-sidebar)] lg:flex">
          <div className="border-b border-[var(--console-line)] px-4 py-3">
            <p className="text-[12px] font-semibold text-[var(--console-ink)]">
              Needs attention
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--console-faint)]">
              Decisions and agent work from across flows
            </p>
          </div>
          <ScrollArea className="flex-1">
            {spotlight.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-[12px] text-[var(--console-muted)]">
                  No open work yet. Start a flow, or ask Forge to ship a change.
                </p>
                <Link href="/app/work/new" className="mt-3 inline-block">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-md border-[var(--console-line)] text-[12px]"
                  >
                    Start a flow
                  </Button>
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-[var(--console-line)]">
                {spotlight.map((item) => {
                  const needsHuman =
                    item.stage_type === "human" || item.stage_type === "legacy";
                  return (
                    <li key={item.id}>
                      <Link
                        href={workItemHref(item)}
                        className="block px-4 py-3 transition hover:bg-white/70"
                      >
                        <p className="truncate text-[12px] font-medium text-[var(--console-ink)]">
                          {item.title}
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-[var(--console-muted)]">
                          {item.process_name} · {item.stage_name}
                        </p>
                        <p
                          className={cn(
                            "mt-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.06em]",
                            needsHuman
                              ? "text-amber-700"
                              : item.stage_type === "agent"
                                ? "text-[var(--console-accent)]"
                                : "text-[var(--console-faint)]",
                          )}
                        >
                          {!needsHuman && item.stage_type === "agent" ? (
                            <LiveDot className="size-1.5 [&>span]:size-1.5" />
                          ) : null}
                          {needsHuman
                            ? "Needs you"
                            : item.stage_type === "agent"
                              ? "Agents working"
                              : "Waiting"}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </aside>
      </div>
    </div>
  );
}
