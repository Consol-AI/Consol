import { sql } from "@/lib/db";
import { createId } from "@/lib/id";

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

export async function createAgentRun(input: {
  workItemId: string;
  processId: string;
  provider?: string;
  externalAgentId?: string;
  externalRunId?: string;
  status?: string;
  prompt?: string;
  repoUrl?: string;
  branch?: string;
  prUrl?: string;
  agentUrl?: string;
  resultSummary?: string;
  metadata?: Record<string, unknown>;
  createdBy: string;
}): Promise<AgentRun> {
  const id = createId("arn");
  await sql(
    `insert into agent_runs (
       id, work_item_id, process_id, provider,
       external_agent_id, external_run_id, status,
       prompt, repo_url, branch, pr_url, agent_url,
       result_summary, raw_metadata, created_by
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15)`,
    [
      id,
      input.workItemId,
      input.processId,
      input.provider ?? "cursor",
      input.externalAgentId ?? "",
      input.externalRunId ?? "",
      input.status ?? "pending",
      input.prompt ?? "",
      input.repoUrl ?? "",
      input.branch ?? "",
      input.prUrl ?? "",
      input.agentUrl ?? "",
      input.resultSummary ?? "",
      JSON.stringify(input.metadata ?? {}),
      input.createdBy,
    ],
  );
  return (await getAgentRun(id))!;
}

export async function getAgentRun(id: string): Promise<AgentRun | null> {
  return (
    (await sql<AgentRun>(`select * from agent_runs where id = $1`, [id]))[0] ??
    null
  );
}

export async function listAgentRunsForWorkItem(
  workItemId: string,
): Promise<AgentRun[]> {
  return sql<AgentRun>(
    `select * from agent_runs where work_item_id = $1 order by created_at desc`,
    [workItemId],
  );
}

export async function listActiveAgentRuns(
  processId?: string,
): Promise<AgentRun[]> {
  if (processId) {
    return sql<AgentRun>(
      `select * from agent_runs
       where process_id = $1
         and upper(status) in ('PENDING','CREATING','RUNNING','WAITING_FOR_BACKGROUND_WORK')
       order by updated_at desc`,
      [processId],
    );
  }
  return sql<AgentRun>(
    `select * from agent_runs
     where upper(status) in ('PENDING','CREATING','RUNNING','WAITING_FOR_BACKGROUND_WORK')
     order by updated_at desc`,
  );
}

export async function updateAgentRun(
  id: string,
  patch: {
    status?: string;
    externalAgentId?: string;
    externalRunId?: string;
    branch?: string;
    prUrl?: string;
    agentUrl?: string;
    resultSummary?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<AgentRun> {
  const existing = await getAgentRun(id);
  if (!existing) throw new Error("Agent run not found");
  const metadata = {
    ...agentRunMetadata(existing),
    ...(patch.metadata ?? {}),
  };
  await sql(
    `update agent_runs set
       status = coalesce($1, status),
       external_agent_id = coalesce($2, external_agent_id),
       external_run_id = coalesce($3, external_run_id),
       branch = coalesce($4, branch),
       pr_url = coalesce($5, pr_url),
       agent_url = coalesce($6, agent_url),
       result_summary = coalesce($7, result_summary),
       raw_metadata = $8::jsonb,
       updated_at = now()
     where id = $9`,
    [
      patch.status ?? null,
      patch.externalAgentId ?? null,
      patch.externalRunId ?? null,
      patch.branch ?? null,
      patch.prUrl ?? null,
      patch.agentUrl ?? null,
      patch.resultSummary ?? null,
      JSON.stringify(metadata),
      id,
    ],
  );
  return (await getAgentRun(id))!;
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
