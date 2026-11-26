import { claudeCodeAgent } from "@/lib/coding-agents/claude-code";
import { cursorCodingAgent } from "@/lib/coding-agents/cursor";
import type { CodingAgentProvider } from "@/lib/coding-agents/types";
import { cursorEnvApiKey } from "@/lib/integrations/cursor/client";
import { claudeCliConfigured } from "@/lib/models/claude-cli";

export type * from "@/lib/coding-agents/types";

const PROVIDERS: Record<string, CodingAgentProvider> = {
  [cursorCodingAgent.key]: cursorCodingAgent,
  [claudeCodeAgent.key]: claudeCodeAgent,
};

function cursorDryRunForced(): boolean {
  const flag = process.env.CONSOL_CURSOR_DRY_RUN?.trim().toLowerCase();
  return flag === "1" || flag === "true";
}

/**
 * Which coding agent to use when the stage doesn't name one:
 * CONSOL_CODING_AGENT, else Cursor when CURSOR_API_KEY is set (or dry-run is
 * forced), else local Claude Code when the claude CLI is installed, else
 * Cursor (which dry-runs without a key).
 */
export function defaultCodingAgentKey(): string {
  const explicit = process.env.CONSOL_CODING_AGENT?.trim().toLowerCase();
  if (explicit && PROVIDERS[explicit]) return explicit;
  if (cursorEnvApiKey() || cursorDryRunForced()) return cursorCodingAgent.key;
  if (claudeCliConfigured()) return claudeCodeAgent.key;
  return cursorCodingAgent.key;
}

/** Provider for a key (stage config `agent` / agent_runs.provider). */
export function getCodingAgent(key?: string | null): CodingAgentProvider | null {
  const wanted = key?.trim().toLowerCase();
  if (!wanted || wanted === "auto") return PROVIDERS[defaultCodingAgentKey()];
  return PROVIDERS[wanted] ?? null;
}

export function listCodingAgents(): CodingAgentProvider[] {
  return Object.values(PROVIDERS);
}
