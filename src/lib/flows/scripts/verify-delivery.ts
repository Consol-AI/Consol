import type { ScriptRunInput, ScriptRunResult } from "@/lib/flows/scripts/types";

/** Lightweight verification gate for the software-delivery test stage. */
export function runVerifyDelivery(input: ScriptRunInput): ScriptRunResult {
  const haystack = `${input.title}\n${input.body}`.toLowerCase();
  const hasAcceptance =
    haystack.includes("acceptance") ||
    haystack.includes("ac:") ||
    haystack.includes("criteria");
  const hasPlan =
    haystack.includes("implement") ||
    haystack.includes("change") ||
    haystack.includes("file");
  const forcedFail = haystack.includes("fail test");

  if (forcedFail) {
    return {
      ok: false,
      outcome: "failure",
      summary: "Verification failed: brief contains an explicit fail-test signal.",
    };
  }

  if (hasAcceptance && hasPlan) {
    return {
      ok: true,
      outcome: "success",
      summary:
        "Verification passed: acceptance criteria and implementation notes are present.",
    };
  }

  return {
    ok: false,
    outcome: "failure",
    summary:
      "Verification failed: add acceptance criteria and an implementation note (or remove 'fail test').",
  };
}
