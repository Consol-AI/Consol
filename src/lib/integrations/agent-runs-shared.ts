/** Client-safe agent run types and helpers (no DB / Node imports). */

export type AgentRun = {
  id: string;
  work_item_id: string;
  process_id: string;
  provider: string;
  external_agent_id: string;
  external_run_id: string;
  status: string;
  prompt: string;
  repo_url: string;
  branch: string;
  pr_url: string;
  agent_url: string;
  result_summary: string;
  raw_metadata: Record<string, unknown> | string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

function parseMetadata(
  value: AgentRun["raw_metadata"],
): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" ? value : {};
}

export function agentRunMetadata(run: AgentRun): Record<string, unknown> {
  return parseMetadata(run.raw_metadata);
}

export function isActiveAgentRunStatus(status: string): boolean {
  const s = status.toUpperCase();
  return (
    s === "PENDING" ||
    s === "CREATING" ||
    s === "RUNNING" ||
    s === "WAITING_FOR_BACKGROUND_WORK"
  );
}
