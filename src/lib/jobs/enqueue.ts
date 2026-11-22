import { enqueueJob } from "@/lib/jobs/queue";

/**
 * Typed producers. Web code (actions, routes) and the flows runtime call these
 * instead of executing long-running work inside a request.
 */

export type StageExecutePayload = {
  itemId: string;
  /** Stage the item was on when queued; the job no-ops if it has moved. */
  stageId: string;
  actorSub: string;
  /** How many times a pending (e.g. CI checks) stage has been re-checked. */
  checks?: number;
};

export type AgentRunPollPayload = {
  runId: string;
  actorSub: string;
  polls?: number;
};

export async function enqueueStageExecution(input: {
  itemId: string;
  stageId: string;
  actorSub: string;
  delayMs?: number;
  checks?: number;
}) {
  const payload: StageExecutePayload = {
    itemId: input.itemId,
    stageId: input.stageId,
    actorSub: input.actorSub,
    checks: input.checks ?? 0,
  };
  return enqueueJob({
    kind: "stage.execute",
    payload,
    workItemId: input.itemId,
    dedupeKey: `stage:${input.itemId}:${input.stageId}`,
    delayMs: input.delayMs,
  });
}

export async function enqueueAgentRunPoll(input: {
  runId: string;
  workItemId: string;
  actorSub: string;
  delayMs?: number;
}) {
  const payload: AgentRunPollPayload = {
    runId: input.runId,
    actorSub: input.actorSub,
    polls: 0,
  };
  return enqueueJob({
    kind: "agent_run.poll",
    payload,
    workItemId: input.workItemId,
    dedupeKey: `agent_run:${input.runId}`,
    delayMs: input.delayMs ?? 10_000,
    // Polling is read-mostly; tolerate transient provider errors.
    maxAttempts: 5,
  });
}
