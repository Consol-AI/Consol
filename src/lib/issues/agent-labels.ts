/**
 * User-facing names for the agents working on a work item.
 *
 * Labels come from the Consol stage/role, never from the underlying coding
 * agent provider (agent_runs.provider) — vendor names stay in stored metadata
 * for debugging but are not shown on the work item page.
 *
 * Client-safe: no DB / Node imports.
 */
import { getAgent } from "@/lib/agents/registry";
import type { Stage } from "@/lib/factory";
import { parseStageConfig } from "@/lib/flows/stage-config";

export const BUILD_AGENT_LABEL = "Build agent";
export const VALIDATE_AGENT_LABEL = "Validate agent";
export const SPEC_AGENT_LABEL = "Spec agent";
export const FALLBACK_AGENT_LABEL = "Agent";

/** Underlying vendor / tool names that must not leak into labels. */
const VENDOR_NAME = /\b(?:claude|cursor|anthropic|openai|codex|copilot)\b/i;

export function mentionsVendor(value: string): boolean {
  return VENDOR_NAME.test(value);
}

function titleCase(value: string): string {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

type StageLike = Pick<Stage, "stage_key" | "stage_type"> &
  Partial<Pick<Stage, "config" | "description" | "name">>;

function isBuildStage(stage: StageLike): boolean {
  if (stage.stage_key === "build") return true;
  const path = String(parseStageConfig(stage.config).path ?? "");
  return path === "coding-agent" || path === "cursor-build";
}

function isValidateStage(stage: StageLike): boolean {
  if (stage.stage_key === "validate") return true;
  return String(parseStageConfig(stage.config).path ?? "") === "validate-pr-checks";
}

/**
 * The single display label for whatever agent runs a stage. Agent stages use
 * their Consol agent (e.g. Forge); build/validate scripts use role labels.
 */
export function agentLabelForStage(stage: StageLike | null | undefined): string {
  if (!stage) return FALLBACK_AGENT_LABEL;
  if (stage.stage_type === "agent") {
    const key = String(parseStageConfig(stage.config).agentKey ?? "").trim();
    const known = key ? getAgent(key.toLowerCase()) : undefined;
    if (known) return known.name;
    if (key && !mentionsVendor(key)) return titleCase(key);
    return stage.stage_key === "spec" ? SPEC_AGENT_LABEL : FALLBACK_AGENT_LABEL;
  }
  if (isBuildStage(stage)) return BUILD_AGENT_LABEL;
  if (isValidateStage(stage)) return VALIDATE_AGENT_LABEL;
  if (stage.stage_key === "spec") return SPEC_AGENT_LABEL;
  return FALLBACK_AGENT_LABEL;
}

const NEUTRAL_BUILD_DESCRIPTION =
  "The build agent implements the change and opens a pull request.";

/**
 * Stage description for display. Older software-delivery processes stored a
 * build description naming the vendors; swap that for Consol copy.
 */
export function stageDescriptionForDisplay(stage: StageLike): string {
  const description = stage.description ?? "";
  if (!mentionsVendor(description)) return description;
  if (isBuildStage(stage)) return NEUTRAL_BUILD_DESCRIPTION;
  return description.replace(new RegExp(VENDOR_NAME.source, "gi"), "agent");
}

// "Claude Code", "Cursor", "Cursor Cloud Agent" … optionally followed by
// " agent" / " build" — older activity summaries were phrased like
// "Cursor agent started" or "Claude Code build finished".
const VENDOR_PHRASE =
  /\b(?:claude code|claude|cursor(?: cloud)?)(?: (agents?|build))?\b/gi;

/**
 * Replace vendor names in Consol-authored activity text with the build agent
 * label. Agent-written free text is left alone except for the names.
 */
export function scrubVendorNames(text: string): string {
  if (!mentionsVendor(text)) return text;
  return text.replace(VENDOR_PHRASE, (_match, suffix: string | undefined, offset: number) => {
    const atStart = offset === 0 || /[.!?:]\s*$/.test(text.slice(0, offset));
    const phrase = suffix?.toLowerCase().startsWith("build") ? "build" : "build agent";
    return atStart ? titleCase(phrase) : phrase;
  });
}
