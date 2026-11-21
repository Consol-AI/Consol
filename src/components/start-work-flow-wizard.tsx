"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { GitBranch, Loader2 } from "lucide-react";
import {
  startWorkFlowAction,
  type StartWorkFlowState,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FlowDefinition, FlowInputField } from "@/lib/flows";
import { stageMeta } from "@/lib/issues/stage-meta";
import { cn } from "@/lib/utils";

type Step = "select" | "details" | "confirm";

const initialState: StartWorkFlowState = {};

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: FlowInputField;
  value: string;
  onChange: (value: string) => void;
}) {
  const common =
    "border-[var(--console-line)] bg-white text-[13px] shadow-none focus-visible:border-[var(--console-accent)] focus-visible:ring-[var(--console-accent-ring)]";

  if (field.type === "text") {
    return (
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        required={field.required !== false}
        className={cn("min-h-24 resize-y", common)}
      />
    );
  }

  if (field.type === "select") {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={field.required !== false}
        className={cn(
          "flex h-9 w-full rounded-md border px-3 text-[13px] outline-none",
          common,
        )}
      >
        <option value="">Select…</option>
        {(field.options ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <Input
      type={field.type === "url" ? "url" : "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      required={field.required !== false}
      className={cn("h-9", common)}
    />
  );
}

export function StartWorkFlowWizard({
  flows,
  initialFlowKey,
}: {
  flows: FlowDefinition[];
  initialFlowKey?: string;
}) {
  const initialFlow = flows.find((flow) => flow.key === initialFlowKey) ?? null;
  const [step, setStep] = useState<Step>(initialFlow ? "details" : "select");
  const [flowKey, setFlowKey] = useState(initialFlow?.key ?? "");
  const [values, setValues] = useState<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    for (const field of initialFlow?.inputs ?? []) next[field.key] = "";
    return next;
  });
  const [state, formAction, pending] = useActionState(
    startWorkFlowAction,
    initialState,
  );

  const flow = useMemo(
    () => flows.find((entry) => entry.key === flowKey) ?? null,
    [flows, flowKey],
  );

  function chooseFlow(next: FlowDefinition) {
    setFlowKey(next.key);
    const blank: Record<string, string> = {};
    for (const field of next.inputs) blank[field.key] = "";
    setValues(blank);
    setStep("details");
  }

  function detailsValid() {
    if (!flow) return false;
    return flow.inputs.every((field) => {
      if (field.required === false) return true;
      return Boolean((values[field.key] ?? "").trim());
    });
  }

  return (
    <div className="mx-auto w-full max-w-[720px] px-5 py-6 md:px-8 md:py-8">
      <div className="animate-rise">
        <p className="text-[12px] text-[var(--console-faint)]">
          <Link
            href="/app/work"
            className="transition hover:text-[var(--console-accent)]"
          >
            Work
          </Link>
          <span className="mx-1.5">/</span>
          Start flow
        </p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-[var(--console-ink)]">
          Start a flow
        </h1>
        <p className="mt-1 text-[13px] text-[var(--console-muted)]">
          Choose a template, fill in the required context, and open a running
          job — no product setup needed.
        </p>
      </div>

      <ol className="mb-5 mt-5 flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--console-faint)]">
        {(
          [
            ["select", "Flow"],
            ["details", "Details"],
            ["confirm", "Confirm"],
          ] as const
        ).map(([id, label]) => (
          <li
            key={id}
            className={cn(
              "rounded-full px-2.5 py-1",
              step === id
                ? "bg-[var(--console-ink)] text-white"
                : "bg-[var(--console-panel)]",
            )}
          >
            {label}
          </li>
        ))}
      </ol>

      <div className="animate-rise-delay rounded-xl bg-[var(--console-surface)] p-5 shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)] md:p-6">
        {step === "select" ? (
          <div className="space-y-4">
            <p className="text-[13px] text-[var(--console-muted)]">
              Pick the flow this job should run through.
            </p>
            <div className="grid gap-3">
              {flows.map((entry) => {
                const typeCounts = entry.stages.reduce(
                  (acc, stage) => {
                    acc[stage.type] = (acc[stage.type] ?? 0) + 1;
                    return acc;
                  },
                  {} as Record<string, number>,
                );
                return (
                  <button
                    key={entry.key}
                    type="button"
                    onClick={() => chooseFlow(entry)}
                    className="rounded-lg border border-[var(--console-line)] bg-[var(--console-panel)]/40 p-4 text-left transition hover:border-[var(--console-accent)] hover:bg-[var(--console-accent-soft)]"
                  >
                    <span className="flex items-center gap-2 text-[13px] font-semibold text-[var(--console-ink)]">
                      <GitBranch className="size-3.5 text-[var(--console-accent)]" />
                      {entry.name}
                    </span>
                    <span className="mt-1.5 block text-[12px] leading-relaxed text-[var(--console-muted)]">
                      {entry.description}
                    </span>
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      {(["agent", "human", "script"] as const).map((type) => {
                        const count = typeCounts[type];
                        if (!count) return null;
                        const meta = stageMeta(type);
                        return (
                          <span
                            key={type}
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-medium",
                              meta.badgeClass,
                            )}
                          >
                            {count} {meta.label}
                          </span>
                        );
                      })}
                      <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-[var(--console-faint)] ring-1 ring-[var(--console-line)]">
                        {entry.inputs.length} inputs
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {step === "details" && flow ? (
          <div className="space-y-4">
            <p className="text-[13px] text-[var(--console-muted)]">
              {flow.name} — provide the context this flow needs to start.
            </p>
            <div className="space-y-3.5">
              {flow.inputs.map((field) => (
                <label key={field.key} className="block space-y-1.5">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-[12px] font-medium text-[var(--console-ink)]">
                      {field.label}
                      {field.required === false ? (
                        <span className="ml-1 font-normal text-[var(--console-faint)]">
                          (optional)
                        </span>
                      ) : null}
                    </span>
                  </span>
                  {field.description ? (
                    <span className="block text-[11px] text-[var(--console-faint)]">
                      {field.description}
                    </span>
                  ) : null}
                  <FieldControl
                    field={field}
                    value={values[field.key] ?? ""}
                    onChange={(next) =>
                      setValues((prev) => ({ ...prev, [field.key]: next }))
                    }
                  />
                </label>
              ))}
            </div>
            <div className="flex flex-wrap justify-between gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="h-9 border-[var(--console-line)] text-[13px]"
                onClick={() => setStep("select")}
              >
                Back
              </Button>
              <Button
                type="button"
                disabled={!detailsValid()}
                className="h-9 bg-[var(--console-ink)] text-[13px] text-white hover:bg-[var(--console-accent)]"
                onClick={() => setStep("confirm")}
              >
                Continue
              </Button>
            </div>
          </div>
        ) : null}

        {step === "confirm" && flow ? (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="flowKey" value={flow.key} />
            {flow.inputs.map((field) => (
              <input
                key={field.key}
                type="hidden"
                name={`input:${field.key}`}
                value={values[field.key] ?? ""}
              />
            ))}
            <p className="text-[13px] text-[var(--console-muted)]">
              Review and start. Consol will open a job on the{" "}
              <span className="font-medium text-[var(--console-ink)]">
                {flow.name}
              </span>{" "}
              flow.
            </p>
            <dl className="space-y-3 rounded-lg bg-[var(--console-panel)] p-4 ring-1 ring-[var(--console-line)]">
              {flow.inputs.map((field) => {
                const value = (values[field.key] ?? "").trim();
                if (!value) return null;
                return (
                  <div key={field.key}>
                    <dt className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--console-faint)]">
                      {field.label}
                    </dt>
                    <dd className="mt-0.5 whitespace-pre-wrap text-[13px] text-[var(--console-ink)]">
                      {value}
                    </dd>
                  </div>
                );
              })}
            </dl>
            {state.error ? (
              <div className="rounded-lg bg-red-50 px-3.5 py-2.5 text-[12px] text-red-700">
                {state.error}
              </div>
            ) : null}
            <div className="flex flex-wrap justify-between gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                className="h-9 border-[var(--console-line)] text-[13px]"
                onClick={() => setStep("details")}
                disabled={pending}
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={pending}
                className="h-9 gap-1.5 bg-[var(--console-ink)] text-[13px] text-white hover:bg-[var(--console-accent)]"
              >
                {pending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : null}
                Start flow
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
