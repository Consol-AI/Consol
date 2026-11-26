import { sql } from "@/lib/db";
import {
  addMessage,
  addStageRunEvent,
  getProcess,
  getProduct,
  getWorkItem,
  listStages,
  type WorkItem,
} from "@/lib/factory";
import {
  isActiveAgentRunStatus,
  listAgentRunsForWorkItem,
  updateAgentRun,
} from "@/lib/integrations/agent-runs";
import { stopCursorAgent } from "@/lib/integrations/cursor/client";
import { getCursorApiKey } from "@/lib/integrations/cursor/credentials";
import { cancelJobsForWorkItem } from "@/lib/jobs/queue";

/**
 * Stop / delete a flow (work item).
 *
 * Stop is a DB transition, so it reaches every process:
 *   1. work item → status 'stopped' (atomic; guarded writes in factory and
 *      enqueueJob refuse to move, complete or queue work for it afterwards);
 *   2. queued/running jobs → 'cancelled' (workers notice within ~2s and abort
 *      the handler's AbortSignal, which cancels in-flight model calls);
 *   3. active external agent runs (Cursor) → stop requested remotely
 *      (best-effort) and marked CANCELLED locally so polling ends.
 *
 * Delete stops the flow first, then soft-deletes it (deleted_at/by).
 * Both are idempotent. Durable artifacts (branches, PRs) are left in place.
 */

export type StopWorkItemResult = {
  /** The item after the call (null when it is deleted or never existed). */
  item: WorkItem | null;
  /** True when this call moved the item to 'stopped'. */
  stopped: boolean;
  cancelledJobs: number;
  cancelledRuns: number;
  warnings: string[];
};

async function organizationIdForProcess(
  processId: string,
): Promise<string | null> {
  const process = await getProcess(processId);
  if (!process) return null;
  if (process.organization_id) return process.organization_id;
  if (!process.product_id) return null;
  return (await getProduct(process.product_id))?.organization_id ?? null;
}

/** Stop every active external agent run for the item. Idempotent. */
export async function cancelAgentRunsForWorkItem(input: {
  workItemId: string;
  processId: string;
  actorSub: string;
}): Promise<{ cancelled: number; warnings: string[] }> {
  const runs = (await listAgentRunsForWorkItem(input.workItemId)).filter((r) =>
    isActiveAgentRunStatus(r.status),
  );
  const warnings: string[] = [];
  if (!runs.length) return { cancelled: 0, warnings };

  const organizationId = await organizationIdForProcess(input.processId);
  const apiKey = organizationId
    ? ((await getCursorApiKey(organizationId)) ?? "")
    : "";

  for (const run of runs) {
    let remoteStop = "skipped";
    if (run.provider === "cursor" && run.external_agent_id) {
      try {
        const result = await stopCursorAgent({
          apiKey,
          agentId: run.external_agent_id,
        });
        remoteStop = result.dryRun ? "dry-run" : "requested";
      } catch (error) {
        remoteStop = "failed";
        warnings.push(
          `Could not stop Cursor agent ${run.external_agent_id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
    await updateAgentRun(run.id, {
      status: "CANCELLED",
      metadata: {
        cancelledAt: new Date().toISOString(),
        cancelledBy: input.actorSub,
        remoteStop,
      },
    });
  }
  return { cancelled: runs.length, warnings };
}

async function cancelAllWork(input: {
  item: WorkItem;
  actorSub: string;
}): Promise<{ jobs: number; runs: number; warnings: string[] }> {
  const jobs = await cancelJobsForWorkItem(
    input.item.id,
    `Flow stopped by ${input.actorSub}`,
  );
  const runs = await cancelAgentRunsForWorkItem({
    workItemId: input.item.id,
    processId: input.item.process_id,
    actorSub: input.actorSub,
  });
  return { jobs: jobs.length, runs: runs.cancelled, warnings: runs.warnings };
}

export async function stopWorkItem(input: {
  itemId: string;
  actorSub: string;
}): Promise<StopWorkItemResult> {
  const before = await getWorkItem(input.itemId);
  if (!before) {
    return {
      item: null,
      stopped: false,
      cancelledJobs: 0,
      cancelledRuns: 0,
      warnings: [],
    };
  }

  // Atomic transition: only one caller wins; done items stay done.
  const transitioned = await sql<{ id: string }>(
    `update work_items
     set status = 'stopped', stopped_at = now(), stopped_by = $2, updated_at = now()
     where id = $1 and status not in ('done', 'stopped') and deleted_at is null
     returning id`,
    [input.itemId, input.actorSub],
  );
  const stopped = Boolean(transitioned[0]);

  // Repeat stops still sweep (cheap, idempotent) in case a straggler slipped
  // in; finished items have nothing to cancel.
  const work =
    stopped || before.status === "stopped"
      ? await cancelAllWork({ item: before, actorSub: input.actorSub })
      : { jobs: 0, runs: 0, warnings: [] as string[] };

  if (stopped) {
    const stage = (await listStages(before.process_id)).find(
      (s) => s.id === before.stage_id,
    );
    const parts = [
      work.jobs ? `${work.jobs} queued/running job${work.jobs === 1 ? "" : "s"}` : "",
      work.runs ? `${work.runs} agent run${work.runs === 1 ? "" : "s"}` : "",
    ].filter(Boolean);
    const summary = `Flow stopped by ${input.actorSub}${
      parts.length ? ` — cancelled ${parts.join(" and ")}` : ""
    }.`;
    await addStageRunEvent({
      workItemId: before.id,
      processId: before.process_id,
      stageKey: stage?.stage_key || before.stage_id,
      stageType: stage?.stage_type ?? "legacy",
      outcome: "cancelled",
      summary,
      createdBy: input.actorSub,
      metadata: {
        cancelledJobs: work.jobs,
        cancelledRuns: work.runs,
        warnings: work.warnings,
      },
    });
    await addMessage({
      processId: before.process_id,
      workItemId: before.id,
      role: "system",
      content: [summary, ...work.warnings].join("\n"),
      authorName: "Flow",
    });
  }

  return {
    item: await getWorkItem(input.itemId),
    stopped,
    cancelledJobs: work.jobs,
    cancelledRuns: work.runs,
    warnings: work.warnings,
  };
}

export async function deleteWorkItem(input: {
  itemId: string;
  actorSub: string;
}): Promise<{ deleted: boolean; stop: StopWorkItemResult }> {
  const stop = await stopWorkItem(input);
  // Done items skip the stop sweep; make sure nothing lingers either way.
  await cancelJobsForWorkItem(input.itemId, `Flow deleted by ${input.actorSub}`);
  const rows = await sql<{ id: string }>(
    `update work_items
     set deleted_at = now(), deleted_by = $2, updated_at = now()
     where id = $1 and deleted_at is null
     returning id`,
    [input.itemId, input.actorSub],
  );
  return { deleted: Boolean(rows[0]), stop };
}
