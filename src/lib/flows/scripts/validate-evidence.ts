import type { ScriptRunInput, ScriptRunResult } from "@/lib/flows/scripts/types";

/** Evidence check for the product-management validate stage. */
export function runValidateEvidence(input: ScriptRunInput): ScriptRunResult {
  const haystack = `${input.title}\n${input.body}`.toLowerCase();
  const hasEvidence =
    haystack.includes("evidence") ||
    haystack.includes("interview") ||
    haystack.includes("metric") ||
    haystack.includes("experiment");
  const forcedFail = haystack.includes("fail validate");

  if (forcedFail) {
    return {
      ok: false,
      outcome: "failure",
      summary: "Validation failed: brief contains an explicit fail-validate signal.",
    };
  }

  if (hasEvidence) {
    return {
      ok: true,
      outcome: "success",
      summary: "Validation passed: evidence signals found in the brief.",
    };
  }

  return {
    ok: false,
    outcome: "failure",
    summary:
      "Validation failed: note evidence (interview, metric, or experiment) in the brief.",
  };
}
