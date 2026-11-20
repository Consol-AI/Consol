import { runValidateEvidence } from "@/lib/flows/scripts/validate-evidence";
import { runVerifyDelivery } from "@/lib/flows/scripts/verify-delivery";
import type { ScriptRunInput, ScriptRunResult } from "@/lib/flows/scripts/types";

const SCRIPT_RUNNERS: Record<
  string,
  (input: ScriptRunInput) => ScriptRunResult
> = {
  "verify-delivery": runVerifyDelivery,
  "validate-evidence": runValidateEvidence,
};

function runInline(input: ScriptRunInput): ScriptRunResult {
  const source = (input.inline ?? "").trim().toLowerCase();
  if (!source) {
    return {
      ok: true,
      outcome: "success",
      summary: "Inline script empty — treated as success.",
    };
  }
  if (source.includes("fail") || source === "false" || source === "0") {
    return {
      ok: false,
      outcome: "failure",
      summary: "Inline script reported failure.",
    };
  }
  return {
    ok: true,
    outcome: "success",
    summary: "Inline script reported success.",
  };
}

export function runFlowScript(input: {
  path?: string;
  inline?: string;
  title: string;
  body: string;
  stageKey: string;
}): ScriptRunResult {
  const payload: ScriptRunInput = {
    title: input.title,
    body: input.body,
    stageKey: input.stageKey,
    inline: input.inline,
  };

  if (input.path) {
    const runner = SCRIPT_RUNNERS[input.path];
    if (!runner) {
      return {
        ok: false,
        outcome: "failure",
        summary: `Unknown script path: ${input.path}`,
      };
    }
    return runner(payload);
  }

  return runInline(payload);
}

export type { ScriptRunInput, ScriptRunResult };
