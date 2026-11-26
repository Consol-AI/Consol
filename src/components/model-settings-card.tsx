"use client";

import { useState, useTransition } from "react";
import { Cpu, Loader2 } from "lucide-react";
import {
  clearModelPreferenceAction,
  saveModelPreferenceAction,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import type { ModelOption } from "@/lib/models";
import { writeStoredModelRef } from "@/components/model-picker";

type Props = {
  options: ModelOption[];
  activeRef: string | null;
  failoverRefs: string[];
  preferenceRef: string | null;
};

export function ModelSettingsCard({
  options,
  activeRef,
  failoverRefs,
  preferenceRef,
}: Props) {
  const [selected, setSelected] = useState(
    preferenceRef ?? activeRef ?? options[0]?.ref ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    setNotice(null);
    const formData = new FormData();
    formData.set("modelRef", selected);
    startTransition(async () => {
      try {
        await saveModelPreferenceAction(formData);
        writeStoredModelRef(selected);
        setNotice(`Primary model set to ${selected}.`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save.");
      }
    });
  }

  function clear() {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        await clearModelPreferenceAction();
        writeStoredModelRef(null);
        setNotice("Cleared — using CONSOL_MODEL / first configured key.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not clear.");
      }
    });
  }

  return (
    <section className="overflow-hidden rounded-xl bg-[var(--console-surface)] shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)]">
      <header className="flex items-start gap-3 border-b border-[var(--console-line)] px-4 py-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--console-panel)] text-[var(--console-ink)] ring-1 ring-[var(--console-line)]">
          <Cpu className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-semibold tracking-tight text-[var(--console-ink)]">
            Text models
          </h2>
          <p className="mt-0.5 text-[12px] text-[var(--console-muted)]">
            Pick the primary provider for Forge chat and agent stages. When it
            hits a rate limit or capacity error, Consol automatically tries the
            rest of the failover chain.
          </p>
        </div>
      </header>

      <div className="space-y-4 px-4 py-4">
        {options.length === 0 ? (
          <p className="text-[12px] text-[var(--console-muted)]">
            No providers configured. Set{" "}
            <code className="rounded bg-[var(--console-panel)] px-1 py-0.5 text-[11px]">
              ANTHROPIC_API_KEY
            </code>
            , log in to the{" "}
            <code className="rounded bg-[var(--console-panel)] px-1 py-0.5 text-[11px]">
              claude
            </code>{" "}
            CLI, or add{" "}
            <code className="rounded bg-[var(--console-panel)] px-1 py-0.5 text-[11px]">
              OPENAI_API_KEY
            </code>{" "}
            /{" "}
            <code className="rounded bg-[var(--console-panel)] px-1 py-0.5 text-[11px]">
              AI_GATEWAY_API_KEY
            </code>
            .
          </p>
        ) : (
          <>
            <div className="space-y-1.5">
              <label
                htmlFor="model-ref"
                className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--console-faint)]"
              >
                Primary model
              </label>
              <select
                id="model-ref"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="h-9 w-full rounded-lg border border-[var(--console-line)] bg-[var(--console-panel)]/40 px-2.5 font-mono text-[13px] text-[var(--console-ink)] outline-none focus-visible:border-[var(--console-accent)]"
              >
                {options.map((option) => (
                  <option key={option.ref} value={option.ref}>
                    {option.label} — {option.ref}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className="h-9"
                disabled={pending || !selected}
                onClick={save}
              >
                {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Use this model
              </Button>
              {preferenceRef ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9"
                  disabled={pending}
                  onClick={clear}
                >
                  Clear preference
                </Button>
              ) : null}
            </div>
          </>
        )}

        {activeRef ? (
          <div className="rounded-lg bg-[var(--console-panel)]/50 px-3 py-2.5 text-[12px] text-[var(--console-muted)] ring-1 ring-[var(--console-line)]">
            <p>
              Active now:{" "}
              <span className="font-mono text-[var(--console-ink)]">
                {activeRef}
              </span>
            </p>
            {failoverRefs.length > 1 ? (
              <p className="mt-1.5">
                Failover:{" "}
                <span className="font-mono text-[var(--console-ink)]">
                  {failoverRefs.join(" → ")}
                </span>
              </p>
            ) : (
              <p className="mt-1.5">
                Add another provider key (or{" "}
                <code className="rounded bg-[var(--console-surface)] px-1 py-0.5 text-[11px]">
                  CONSOL_MODEL_FALLBACKS
                </code>
                ) so rate limits can hand off automatically.
              </p>
            )}
          </div>
        ) : null}

        {error ? (
          <p className="rounded-md bg-red-50 px-2.5 py-1.5 text-[12px] text-red-700">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="rounded-md bg-[var(--console-accent-soft)] px-2.5 py-1.5 text-[12px] text-[var(--console-accent)]">
            {notice}
          </p>
        ) : null}
      </div>
    </section>
  );
}
