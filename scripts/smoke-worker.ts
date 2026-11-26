/**
 * End-to-end check of the job queue + worker on whatever DB is configured
 * (PGlite by default). Queues the entry agent stage, runs a worker, and
 * waits for the job to finish and the agent draft to land on the item.
 *
 *   npm run smoke:worker
 */
import {
  createWorkItem,
  ensureOrgProcess,
  ensureWorkspace,
  getWorkItem,
  listStageRunEvents,
  listStages,
} from "../src/lib/factory";
import { getFlow } from "../src/lib/flows";
import { queueCurrentStage } from "../src/lib/flows/runtime";
import { enqueueJob, workActivity } from "../src/lib/jobs/queue";
import { startWorker } from "../src/lib/jobs/worker";
import { sql } from "../src/lib/db";

async function waitFor<T>(fn: () => Promise<T | null>, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const value = await fn();
    if (value) return value;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("timed out");
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
    title: "Worker smoke",
    body: "Check the queue end to end.",
    createdBy: viewer.sub,
  });

  const queued = await queueCurrentStage({ itemId: item.id, actorSub: viewer.sub });
  const dup = await queueCurrentStage({ itemId: item.id, actorSub: viewer.sub });
  const before = await workActivity({ workItemId: item.id });

  // A job with no handler must fail cleanly, not wedge the worker.
  await enqueueJob({ kind: "bogus" as never, workItemId: item.id });

  const worker = startWorker({ concurrency: 2, pollIntervalMs: 100, log: () => {} });
  const jobs = await waitFor(async () => {
    const rows = await sql<{ kind: string; status: string; last_error: string }>(
      `select kind, status, last_error from jobs where work_item_id = $1 order by created_at`,
      [item.id],
    );
    return rows.every((r) => r.status === "succeeded" || r.status === "failed")
      ? rows
      : null;
  });
  await worker.stop();

  const after = await getWorkItem(item.id);
  const events = await listStageRunEvents(item.id);
  const activity = await workActivity({ workItemId: item.id });
  const result = {
    entryStage: `${entry.stage_key} (${entry.stage_type})`,
    queuedSummary: queued.summary,
    duplicateSummary: dup.summary,
    activeBefore: before.active,
    jobs,
    movedFrom: entry.stage_key,
    nowOnStage: stages.find((s) => s.id === after?.stage_id)?.stage_key,
    bodyHasDraft: Boolean(after?.body.includes("###")),
    events: events.map((e) => `${e.stage_key}:${e.outcome}`),
    activeAfter: activity.active,
    stampChanged: activity.stamp !== before.stamp,
  };
  console.log(JSON.stringify(result, null, 2));

  const ok =
    before.active &&
    !activity.active &&
    activity.stamp !== before.stamp &&
    jobs.length === 2 &&
    jobs.some((j) => j.kind === "stage.execute" && j.status === "succeeded") &&
    jobs.some((j) => j.kind === "bogus" && j.status === "failed") &&
    result.bodyHasDraft;
  if (!ok) throw new Error("worker smoke failed");
  console.log("worker smoke: ok");
}

// PGlite keeps the event loop alive; exit explicitly once checks pass.
main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
