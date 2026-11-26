import { sql } from "@/lib/db";
import { createId } from "@/lib/id";
import {
  agentRunMetadata,
  type AgentRun,
} from "@/lib/integrations/agent-runs-shared";

export type { AgentRun } from "@/lib/integrations/agent-runs-shared";
export {
  agentRunMetadata,
  isActiveAgentRunStatus,
} from "@/lib/integrations/agent-runs-shared";

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

/** Most recent agent run per work item, in one query. */
export async function listLatestAgentRuns(
  workItemIds: string[],
): Promise<AgentRun[]> {
  if (workItemIds.length === 0) return [];
  return sql<AgentRun>(
    `select distinct on (work_item_id) * from agent_runs
     where work_item_id = any($1::text[])
     order by work_item_id, created_at desc`,
    [workItemIds],
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
