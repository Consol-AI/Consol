"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Bot, Sparkles, SquarePen } from "lucide-react";
import {
  createTeammateAction,
  type CreateTeammateState,
} from "@/app/teammate-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  BLANK_DEFAULTS,
  TEAMMATE_PRESETS,
  slugifyName,
  type TeammatePreset,
} from "@/lib/teammates/presets";
import { cn } from "@/lib/utils";

type Step = "start" | "identity" | "role" | "confirm";
type Mode = "preset" | "blank";

const initialState: CreateTeammateState = {};

export function CreateTeammateWizard() {
  const [step, setStep] = useState<Step>("start");
  const [mode, setMode] = useState<Mode | null>(null);
  const [presetId, setPresetId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [role, setRole] = useState("");
  const [brief, setBrief] = useState("");
  const [modelId, setModelId] = useState(BLANK_DEFAULTS.model.id);
  const [state, formAction, pending] = useActionState(
    createTeammateAction,
    initialState,
  );

  const preset: TeammatePreset | undefined = useMemo(
    () => TEAMMATE_PRESETS.find((p) => p.id === presetId),
    [presetId],
  );

  const tools = preset?.tools ?? BLANK_DEFAULTS.tools;

  function choosePreset(p: TeammatePreset) {
    setMode("preset");
    setPresetId(p.id);
    setRole(p.role);
    setBrief(p.briefTemplate);
    setModelId(p.model.id);
    if (!name) {
      setName(p.label);
      setSlug(slugifyName(p.label));
    }
    setStep("identity");
  }

  function chooseBlank() {
    setMode("blank");
    setPresetId(null);
    setRole(BLANK_DEFAULTS.role);
    setBrief("");
    setModelId(BLANK_DEFAULTS.model.id);
    setStep("identity");
  }

  function onNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugifyName(value));
  }

  return (
    <div className="mx-auto w-full max-w-[720px] px-5 py-6 md:px-8 md:py-8">
      <div className="animate-rise mb-6">
        <p className="text-[12px] text-[var(--console-faint)]">
          <Link href="/app/teammates" className="hover:text-[var(--console-ink)]">
            Teammates
          </Link>
          <span className="mx-1.5">/</span>
          New
        </p>
        <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-[var(--console-ink)]">
          Create a teammate
        </h1>
        <p className="mt-1 text-[13px] text-[var(--console-muted)]">
          Each teammate is a specialist in Consol and a deployable Agent SDK
          project under <code className="text-[12px]">agents/</code>.
        </p>
      </div>

      <ol className="mb-5 flex flex-wrap gap-2 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--console-faint)]">
        {(
          [
            ["start", "Start"],
            ["identity", "Identity"],
            ["role", "Role"],
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
        {step === "start" ? (
          <div className="space-y-4">
            <p className="text-[13px] text-[var(--console-muted)]">
              Choose how to start. Preset and blank are equal paths.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {TEAMMATE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => choosePreset(p)}
                  className="rounded-lg border border-[var(--console-line)] bg-[var(--console-panel)]/40 p-4 text-left transition hover:border-[var(--console-accent)] hover:bg-[var(--console-accent-soft)]"
                >
                  <span className="flex items-center gap-2 text-[13px] font-semibold text-[var(--console-ink)]">
                    <Sparkles className="size-3.5 text-[var(--console-accent)]" />
                    {p.label}
                  </span>
                  <span className="mt-1.5 block text-[12px] leading-relaxed text-[var(--console-muted)]">
                    {p.description}
                  </span>
                </button>
              ))}
              <button
                type="button"
                onClick={chooseBlank}
                className="rounded-lg border border-dashed border-[var(--console-line)] p-4 text-left transition hover:border-[var(--console-accent)] hover:bg-[var(--console-accent-soft)] sm:col-span-2"
              >
                <span className="flex items-center gap-2 text-[13px] font-semibold text-[var(--console-ink)]">
                  <SquarePen className="size-3.5 text-[var(--console-accent)]" />
                  Blank teammate
                </span>
                <span className="mt-1.5 block text-[12px] leading-relaxed text-[var(--console-muted)]">
                  Start empty. You set the brief, model, and role yourself.
                </span>
              </button>
            </div>
          </div>
        ) : null}

        {step === "identity" ? (
          <div className="space-y-4">
            <p className="text-[13px] text-[var(--console-muted)]">
              {mode === "preset"
                ? `Preset: ${preset?.label ?? "Specialist"}`
                : "Blank teammate"}
            </p>
            <label className="block space-y-1.5">
              <span className="text-[12px] font-medium text-[var(--console-ink)]">
                Name
              </span>
              <Input
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="e.g. Nova"
                className="h-9 rounded-md border-[var(--console-line)] bg-white text-[13px]"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[12px] font-medium text-[var(--console-ink)]">
                Slug
              </span>
              <Input
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase());
                }}
                placeholder="nova"
                className="h-9 rounded-md border-[var(--console-line)] bg-white font-mono text-[13px]"
              />
              <span className="text-[11px] text-[var(--console-faint)]">
                Creates <code>agents/{slug || "…"}/</code>
              </span>
            </label>
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-[12px]"
                onClick={() => setStep("start")}
              >
                Back
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 rounded-md bg-[var(--console-accent)] text-[12px] text-white hover:bg-[var(--console-accent-hover)]"
                disabled={!name.trim() || !slug.trim()}
                onClick={() => setStep("role")}
              >
                Continue
              </Button>
            </div>
          </div>
        ) : null}

        {step === "role" ? (
          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-[12px] font-medium text-[var(--console-ink)]">
                Role
              </span>
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="h-9 rounded-md border-[var(--console-line)] bg-white text-[13px]"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[12px] font-medium text-[var(--console-ink)]">
                Brief
              </span>
              <Textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="Job, sources, output, and approval stops…"
                className="min-h-28 resize-none rounded-md border-[var(--console-line)] bg-white text-[13px]"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[12px] font-medium text-[var(--console-ink)]">
                Model
              </span>
              <Input
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="h-9 rounded-md border-[var(--console-line)] bg-white font-mono text-[13px]"
              />
            </label>
            <p className="text-[12px] text-[var(--console-muted)]">
              Tools: {tools.join(", ")}
            </p>
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-[12px]"
                onClick={() => setStep("identity")}
              >
                Back
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 rounded-md bg-[var(--console-accent)] text-[12px] text-white hover:bg-[var(--console-accent-hover)]"
                disabled={!brief.trim() || !modelId.trim() || !role.trim()}
                onClick={() => setStep("confirm")}
              >
                Continue
              </Button>
            </div>
          </div>
        ) : null}

        {step === "confirm" ? (
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="name" value={name} />
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="presetId" value={presetId ?? ""} />
            <input type="hidden" name="role" value={role} />
            <input type="hidden" name="brief" value={brief} />
            <input type="hidden" name="modelId" value={modelId} />
            <input type="hidden" name="tools" value={tools.join(",")} />

            <div className="flex items-start gap-3 rounded-lg bg-[var(--console-agent)] px-3 py-3">
              <Bot className="mt-0.5 size-4 text-[var(--console-accent)]" />
              <div className="min-w-0 text-[13px] text-[var(--console-ink)]">
                <p className="font-semibold">{name}</p>
                <p className="mt-0.5 text-[12px] text-[var(--console-muted)]">
                  {role} · {mode === "preset" ? preset?.label : "Custom"}
                </p>
              </div>
            </div>

            <dl className="space-y-2 text-[12px]">
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--console-faint)]">Folder</dt>
                <dd className="font-mono text-[var(--console-ink)]">
                  agents/{slug}/
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--console-faint)]">Model</dt>
                <dd className="font-mono text-[var(--console-ink)]">{modelId}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[var(--console-faint)]">Tools</dt>
                <dd className="text-[var(--console-ink)]">{tools.join(", ")}</dd>
              </div>
            </dl>

            <p className="rounded-md bg-[var(--console-panel)] px-3 py-2 text-[12px] leading-relaxed text-[var(--console-muted)]">
              {brief}
            </p>

            {state.error ? (
              <p className="text-[12px] text-red-600">{state.error}</p>
            ) : null}

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-[12px]"
                onClick={() => setStep("role")}
                disabled={pending}
              >
                Back
              </Button>
              <Button
                type="submit"
                size="sm"
                className="h-8 rounded-md bg-[var(--console-ink)] text-[12px] text-white hover:bg-[var(--console-accent)]"
                disabled={pending}
              >
                {pending ? "Creating…" : "Create teammate"}
              </Button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
