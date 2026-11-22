import { addMessage, addStageRunEvent, getWorkItem, listStages } from "@/lib/factory";
import { advanceWorkItem } from "@/lib/flows/runtime";
import {
  getAgentRun,
  isActiveAgentRunStatus,
  listAgentRunsForWorkItem,
} from "@/lib/integrations/agent-runs";
import { pollAgentRun } from "@/lib/integrations/cursor/poll";
import {
  enqueueAgentRunPoll,
  type AgentRunPollPayload,
  type StageExecutePayload,
} from "@/lib/jobs/enqueue";
import type { Job, JobKind } from "@/lib/jobs/queue";

/** What the worker should do with the job after the handler returns. */
export type JobOutcome =
  | { type: "done" }
  | { type: "reschedule"; delayMs: number; payload?: Record<string, unknown> };

export type JobHandler = (job: Job) => Promise<JobOutcome>;

const DONE: JobOutcome = { type: "done" };

/** Re-check pending script stages (e.g. CI) for up to ~6 hours. */
const MAX_PENDING_CHECKS = 200;
/** Stop polling external agent runs after 24 hours. */
const MAX_AGENT_RUN_AGE_MS = 24 * 60 * 60 * 1000;

function backoff(step: number, baseMs: number, capMs: number): number {
  return Math.min(capMs, Math.round(baseMs * 1.5 ** step));
}

async function executeStage(job: Job): Promise<JobOutcome> {
  const payload = job.payload as StageExecutePayload;
  const item = await getWorkItem(payload.itemId);
  // Stale job: item deleted, finished, or moved on since it was queued.
  if (!item || item.status === "done" || item.stage_id !== payload.stageId) {
    return DONE;
  }

  let result;
  try {
    result = await advanceWorkItem({
      itemId: item.id,
      outcome: "default",
      actorSub: payload.actorSub,
      execute: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stage = (await listStages(item.process_id)).find(
      (s) => s.id === payload.stageId,
    );
    await addStageRunEvent({
      workItemId: item.id,
      processId: item.process_id,
      stageKey: stage?.stage_key || payload.stageId,
      stageType: stage?.stage_type ?? "script",
      outcome: "failure",
      summary: `${stage?.name ?? "Stage"} failed: ${message}`,
      createdBy: payload.actorSub,
      metadata: { jobId: job.id },
    });
    await addMessage({
      processId: item.process_id,
      workItemId: item.id,
      role: "system",
      content: `${stage?.name ?? "Stage"} failed: ${message}. Run it again when ready.`,
      authorName: "Worker",
    });
    throw error;
  }

  if (!result.pending) return DONE;

  // An external agent (Cursor) is building: hand off to a poll job.
  const runs = await listAgentRunsForWorkItem(item.id);
  const active = runs.filter((r) => isActiveAgentRunStatus(r.status));
  if (active.length) {
    for (const run of active) {
      await enqueueAgentRunPoll({
        runId: run.id,
        workItemId: item.id,
        actorSub: payload.actorSub,
      });
    }
    return DONE;
  }

  // Otherwise the stage itself is waiting (e.g. PR checks): re-check later.
  const checks = (payload.checks ?? 0) + 1;
  if (checks > MAX_PENDING_CHECKS) {
    await addMessage({
      processId: item.process_id,
      workItemId: item.id,
      role: "system",
      content: "Stopped re-checking this stage after 6 hours. Run it again to resume.",
      authorName: "Worker",
    });
    return DONE;
  }
  return {
    type: "reschedule",
    delayMs: backoff(checks, 15_000, 120_000),
    payload: { ...payload, checks },
  };
}

async function pollRun(job: Job): Promise<JobOutcome> {
  const payload = job.payload as AgentRunPollPayload;
  const run = await getAgentRun(payload.runId);
  if (!run || !isActiveAgentRunStatus(run.status)) return DONE;

  const result = await pollAgentRun(run, payload.actorSub);
  if (!isActiveAgentRunStatus(result.run.status)) return DONE;

  if (Date.now() - new Date(run.created_at).getTime() > MAX_AGENT_RUN_AGE_MS) {
    await addMessage({
      processId: run.process_id,
      workItemId: run.work_item_id,
      role: "system",
      content: `Stopped watching agent run after 24 hours (last status ${result.run.status}).`,
      authorName: "Worker",
    });
    return DONE;
  }

  const polls = (payload.polls ?? 0) + 1;
  return {
    type: "reschedule",
    delayMs: backoff(polls, 10_000, 60_000),
    payload: { ...payload, polls },
  };
}

export const JOB_HANDLERS: Record<JobKind, JobHandler> = {
  "stage.execute": executeStage,
  "agent_run.poll": pollRun,
};
