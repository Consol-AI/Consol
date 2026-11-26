/**
 * End-to-end check of stopping / deleting a flow on whatever DB is configured
 * (PGlite by default):
 *
 *   1. A running job is aborted: a long-running handler sees its AbortSignal
 *      fire after the stop, and the job ends `cancelled`.
 *   2. Nothing new starts: enqueue, advance and moves are refused afterwards.
 *   3. Active agent runs are marked CANCELLED.
 *   4. Stop is idempotent; delete hides the item from reads.
 *
 *   npm run smoke:stop
 */
import {
  createWorkItem,
  ensureOrgProcess,
  ensureWorkspace,
  getWorkItem,
  listStageRunEvents,
  listStages,
  listWorkItems,
  moveWorkItem,
} from "../src/lib/factory";
import { getFlow } from "../src/lib/flows";
import { isFlowStoppedError } from "../src/lib/flows/errors";
import { advanceWorkItem, queueCurrentStage } from "../src/lib/flows/runtime";
import { deleteWorkItem, stopWorkItem } from "../src/lib/flows/stop";
import { createAgentRun, getAgentRun } from "../src/lib/integrations/agent-runs";
import { enqueueStageExecution } from "../src/lib/jobs/enqueue";
import { JOB_HANDLERS } from "../src/lib/jobs/handlers";
import { startWorker } from "../src/lib/jobs/worker";
import { sql } from "../src/lib/db";

async function waitFor<T>(fn: () => Promise<T | null>, timeoutMs = 20_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const value = await fn();
    if (value) return value;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("timed out");
}

async function refused(fn: () => Promise<unknown>): Promise<boolean> {
  try {
    await fn();
    return false;
  } catch (error) {
    return isFlowStoppedError(error);
  }
}

async function main() {
  const viewer = { sub: "user:smoke", name: "Smoke", email: "smoke@example.com" };
  const org = await ensureWorkspace(viewer);
  const flow = getFlow("software-delivery");
  if (!flow) throw new Error("missing flow");
  const process = await ensureOrgProcess({
    organizationId: org.id,
    templateKey: flow.key,
    createdBy: viewer.sub,
  });
  const stages = await listStages(process.id);
  const entry = stages.find((s) => s.stage_key === flow.entry) ?? stages[0];
  const item = await createWorkItem({
    processId: process.id,
    stageId: entry.id,
    title: "Stop smoke",
    body: "Stop me mid-run.",
    createdBy: viewer.sub,
  });

  // Simulate a long-running agent: the handler blocks until it is aborted.
  let handlerStarted = false;
  let abortedAfterMs: number | null = null;
  const original = JOB_HANDLERS["stage.execute"];
  JOB_HANDLERS["stage.execute"] = (_job, ctx) =>
    new Promise((resolve) => {
      handlerStarted = true;
      const started = Date.now();
      ctx.signal.addEventListener("abort", () => {
        abortedAfterMs = Date.now() - started;
        resolve({ type: "done" });
      });
    });

  const run = await createAgentRun({
    workItemId: item.id,
    processId: process.id,
    externalAgentId: "bc-dry-smoke",
    externalRunId: "run-dry-smoke",
    status: "RUNNING",
    createdBy: viewer.sub,
  });

  await queueCurrentStage({ itemId: item.id, actorSub: viewer.sub });
  const worker = startWorker({
    concurrency: 2,
    pollIntervalMs: 100,
    cancelCheckMs: 200,
    log: () => {},
  });
  await waitFor(async () => (handlerStarted ? true : null));

  const stopStarted = Date.now();
  const first = await stopWorkItem({ itemId: item.id, actorSub: viewer.sub });
  await waitFor(async () => (abortedAfterMs !== null ? true : null));
  const abortLatencyMs = Date.now() - stopStarted;
  const second = await stopWorkItem({ itemId: item.id, actorSub: viewer.sub });

  const requeued = await enqueueStageExecution({
    itemId: item.id,
    stageId: entry.id,
    actorSub: viewer.sub,
  });
  const advanceRefused = await refused(() =>
    advanceWorkItem({ itemId: item.id, outcome: "default", actorSub: viewer.sub, execute: true }),
  );
  const moveRefused = await refused(() =>
    moveWorkItem(item.id, stages[1]?.id ?? entry.id),
  );

  await new Promise((r) => setTimeout(r, 500));
  await worker.stop();
  JOB_HANDLERS["stage.execute"] = original;

  const jobs = await sql<{ kind: string; status: string }>(
    `select kind, status from jobs where work_item_id = $1 order by created_at`,
    [item.id],
  );
  const stopped = await getWorkItem(item.id);
  const runAfter = await getAgentRun(run.id);
  const events = await listStageRunEvents(item.id);

  const deleted = await deleteWorkItem({ itemId: item.id, actorSub: viewer.sub });
  const deletedAgain = await deleteWorkItem({ itemId: item.id, actorSub: viewer.sub });
  const visible = (await listWorkItems(process.id)).some((i) => i.id === item.id);
  const readable = await getWorkItem(item.id);

  const result = {
    firstStop: { stopped: first.stopped, jobs: first.cancelledJobs, runs: first.cancelledRuns },
    secondStop: { stopped: second.stopped },
    abortLatencyMs,
    status: stopped?.status,
    stoppedBy: stopped?.stopped_by,
    jobs,
    requeued: Boolean(requeued),
    advanceRefused,
    moveRefused,
    runStatus: runAfter?.status,
    cancelledEvents: events.filter((e) => e.outcome === "cancelled").length,
    deleted: deleted.deleted,
    deletedAgain: deletedAgain.deleted,
    visibleAfterDelete: visible,
    readableAfterDelete: Boolean(readable),
  };
  console.log(JSON.stringify(result, null, 2));

  const ok =
    first.stopped &&
    first.cancelledJobs === 1 &&
    first.cancelledRuns === 1 &&
    !second.stopped &&
    abortLatencyMs < 15_000 &&
    stopped?.status === "stopped" &&
    stopped?.stopped_by === viewer.sub &&
    jobs.length === 1 &&
    jobs[0].status === "cancelled" &&
    !requeued &&
    advanceRefused &&
    moveRefused &&
    runAfter?.status === "CANCELLED" &&
    result.cancelledEvents === 1 &&
    deleted.deleted &&
    !deletedAgain.deleted &&
    !visible &&
    !readable;
  if (!ok) throw new Error("stop smoke failed");
  console.log("stop smoke: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
