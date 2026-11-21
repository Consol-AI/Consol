"use client";

import { useState, useTransition } from "react";
import { KeyRound, Loader2, Trash2 } from "lucide-react";
import {
  clearCursorApiKeyAction,
  saveCursorApiKeyAction,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  connected: boolean;
  accountLogin?: string | null;
  envFallbackConfigured?: boolean;
};

export function CursorApiKeyCard({
  connected,
  accountLogin,
  envFallbackConfigured,
}: Props) {
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    setNotice(null);
    const formData = new FormData();
    formData.set("apiKey", apiKey);
    startTransition(async () => {
      try {
        await saveCursorApiKeyAction(formData);
        setApiKey("");
        setNotice("Cursor API key saved for this workspace.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save key.");
      }
    });
  }

  function clear() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        await clearCursorApiKeyAction();
        setNotice("Cursor API key removed.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not clear key.");
      }
    });
  }

  return (
    <section className="overflow-hidden rounded-xl bg-[var(--console-surface)] shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)]">
      <header className="flex items-start gap-3 border-b border-[var(--console-line)] px-4 py-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--console-panel)] text-[var(--console-ink)] ring-1 ring-[var(--console-line)]">
          <KeyRound className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-semibold tracking-tight text-[var(--console-ink)]">
            Cursor Cloud Agents
          </h2>
          <p className="mt-0.5 text-[12px] text-[var(--console-muted)]">
            Paste a Cursor API key so software delivery can launch Cloud Agents
            that write code and open pull requests.
          </p>
        </div>
        {connected ? (
          <span className="rounded-md bg-[var(--console-accent-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--console-accent)]">
            Connected
          </span>
        ) : envFallbackConfigured ? (
          <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
            Env fallback
          </span>
        ) : (
          <span className="rounded-md bg-[var(--console-panel)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--console-muted)]">
            Not connected
          </span>
        )}
      </header>

      <div className="space-y-3 px-4 py-4">
        {connected ? (
          <p className="text-[12px] text-[var(--console-muted)]">
            Stored as <span className="font-medium text-[var(--console-ink)]">{accountLogin || "API key"}</span>.
            The secret is encrypted at rest and never shown again.
          </p>
        ) : (
          <p className="text-[12px] text-[var(--console-muted)]">
            Create a key in Cursor Dashboard → API Keys. Without a key, builds
            run in dry-run mode.
            {envFallbackConfigured
              ? " A CURSOR_API_KEY env var is available as fallback."
              : null}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="password"
            autoComplete="off"
            placeholder={connected ? "Replace API key…" : "Cursor API key"}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="h-9 flex-1 text-[13px]"
          />
          <Button
            type="button"
            size="sm"
            className="h-9"
            disabled={pending || !apiKey.trim()}
            onClick={save}
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Save key
          </Button>
          {connected ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9"
              disabled={pending}
              onClick={clear}
            >
              <Trash2 className="size-3.5" />
              Remove
            </Button>
          ) : null}
        </div>

        {error || notice ? (
          <p
            className={
              error
                ? "text-[12px] text-red-700"
                : "text-[12px] text-[var(--console-accent)]"
            }
          >
            {error ?? notice}
          </p>
        ) : null}
      </div>
    </section>
  );
}
