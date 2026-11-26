import { hostname } from "node:os";
import { isFlowStoppedError } from "@/lib/flows/errors";
import { listActiveAgentRuns } from "@/lib/integrations/agent-runs";
import { enqueueAgentRunPoll } from "@/lib/jobs/enqueue";
import { JOB_HANDLERS } from "@/lib/jobs/handlers";
import {
  claimJobs,
  completeJob,
  extendLease,
  failJob,
  jobStillOwned,
  rescheduleJob,
  sweepExpiredJobs,
  type Job,
} from "@/lib/jobs/queue";

export type WorkerOptions = {
  /** Max jobs running at once in this process. */
  concurrency?: number;
  /** Idle delay between claim attempts. */
  pollIntervalMs?: number;
  /** Lease length; renewed every third of it while a handler runs. */
  leaseMs?: number;
  /**
   * How often a running job checks it was not cancelled (flow stopped or
   * deleted). On cancellation the handler's AbortSignal fires.
   */
  cancelCheckMs?: number;
  log?: (message: string) => void;
};

export type WorkerHandle = {
  id: string;
  /** Stop claiming and wait for in-flight jobs to finish. */
  stop: () => Promise<void>;
};

function normalizeJob(job: Job): Job {
  if (typeof job.payload === "string") {
    try {
      return { ...job, payload: JSON.parse(job.payload) };
    } catch {
      return { ...job, payload: {} };
    }
  }
  return job;
}

/**
 * Make sure every active external run has a poll job (e.g. runs started
 * before the worker existed, or whose job was lost). Dedupe keeps it a no-op
 * when a job is already queued.
 */
async function reconcileAgentRuns(): Promise<void> {
  for (const run of await listActiveAgentRuns()) {
    await enqueueAgentRunPoll({
      runId: run.id,
      workItemId: run.work_item_id,
      actorSub: "system",
      delayMs: 0,
    });
  }
}

export function startWorker(options: WorkerOptions = {}): WorkerHandle {
  const concurrency = Math.max(1, options.concurrency ?? 4);
  const pollIntervalMs = options.pollIntervalMs ?? 1_000;
  const leaseMs = options.leaseMs ?? 120_000;
  const cancelCheckMs = options.cancelCheckMs ?? 2_000;
  const log = options.log ?? ((m: string) => console.log(`[worker] ${m}`));
  const id = `${hostname()}:${process.pid}:${Math.random().toString(36).slice(2, 8)}`;

  const inFlight = new Set<Promise<void>>();
  let stopping = false;
  let wake: (() => void) | null = null;
  let lastSweep = 0;

  async function runJob(raw: Job) {
    const job = normalizeJob(raw);
    const handler = JOB_HANDLERS[job.kind];
    const heartbeat = setInterval(() => {
      void extendLease(job.id, id, leaseMs).catch(() => {});
    }, Math.floor(leaseMs / 3));
    // Cancellation travels through the DB so a stop issued by the web process
    // reaches whichever worker process holds the job.
    const controller = new AbortController();
    const cancelWatch = setInterval(() => {
      void jobStillOwned(job.id, id)
        .then((owned) => {
          if (!owned && !controller.signal.aborted) {
            controller.abort(new Error("Job cancelled"));
          }
        })
        .catch(() => {});
    }, cancelCheckMs);
    const started = Date.now();
    try {
      if (!handler) throw new Error(`No handler for job kind "${job.kind}"`);
      const outcome = await handler(job, { signal: controller.signal });
      if (controller.signal.aborted) {
        log(`${job.kind} ${job.id} cancelled after ${Date.now() - started}ms`);
      } else if (outcome.type === "reschedule") {
        await rescheduleJob(job.id, outcome.delayMs, outcome.payload);
      } else {
        await completeJob(job.id);
        log(`${job.kind} ${job.id} done in ${Date.now() - started}ms`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (controller.signal.aborted || isFlowStoppedError(error)) {
        // Flow was stopped: the job row is already cancelled (or about to be);
        // completing it keeps a stray running job from lingering.
        await completeJob(job.id).catch(() => {});
        log(`${job.kind} ${job.id} cancelled: ${message}`);
      } else {
        const result = await failJob(job, message).catch(() => "failed");
        log(`${job.kind} ${job.id} ${result}: ${message}`);
      }
    } finally {
      clearInterval(heartbeat);
      clearInterval(cancelWatch);
    }
  }

  async function loop() {
    log(`started ${id} (concurrency ${concurrency})`);
    await reconcileAgentRuns().catch((error) =>
      log(`reconcile failed: ${error instanceof Error ? error.message : error}`),
    );
    while (!stopping) {
      try {
        if (Date.now() - lastSweep > 30_000) {
          lastSweep = Date.now();
          const expired = await sweepExpiredJobs();
          for (const job of expired) log(`${job.kind} ${job.id} lease expired`);
        }

        const jobs = await claimJobs({
          workerId: id,
          limit: concurrency - inFlight.size,
          leaseMs,
        });
        for (const job of jobs) {
          const p = runJob(job).finally(() => {
            inFlight.delete(p);
            wake?.();
          });
          inFlight.add(p);
        }
        // Got a full batch: go straight back for more.
        if (jobs.length > 0 && inFlight.size < concurrency) continue;
      } catch (error) {
        log(`claim failed: ${error instanceof Error ? error.message : error}`);
      }

      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, pollIntervalMs);
        wake = () => {
          clearTimeout(timer);
          resolve();
        };
      });
      wake = null;
    }
    await Promise.allSettled([...inFlight]);
    log(`stopped ${id}`);
  }

  const done = loop();

  return {
    id,
    async stop() {
      stopping = true;
      wake?.();
      await done;
    },
  };
}
