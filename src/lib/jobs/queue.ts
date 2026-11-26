import { sql } from "@/lib/db";
import { createId } from "@/lib/id";

/**
 * Postgres-backed job queue. Works on both Postgres and PGlite (single
 * process), so `npm run dev` needs no extra infrastructure.
 *
 * Lifecycle: queued → running → succeeded | failed. A handler can also
 * reschedule its job (back to queued) to poll an external system. Stopping a
 * flow moves its queued/running jobs to `cancelled`; completion, reschedule
 * and failure only apply while a job is still `running`, so a handler that
 * finishes after a stop cannot revive its job.
 */

export type JobKind = "stage.execute" | "agent_run.poll";

export type JobStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export type Job<P = Record<string, unknown>> = {
  id: string;
  kind: JobKind;
  payload: P;
  status: JobStatus;
  dedupe_key: string | null;
  work_item_id: string | null;
  attempts: number;
  max_attempts: number;
  run_at: string;
  locked_by: string | null;
  locked_until: string | null;
  last_error: string;
  created_at: string;
  updated_at: string;
};

export async function enqueueJob(input: {
  kind: JobKind;
  payload?: Record<string, unknown>;
  workItemId?: string | null;
  /** Skip enqueue when a queued/running job already holds this key. */
  dedupeKey?: string;
  /** Delay before the job becomes claimable. */
  delayMs?: number;
  /** Retries are opt-in: most stage work has side effects. */
  maxAttempts?: number;
}): Promise<Job | null> {
  // Never queue work for a stopped or deleted item (closes the race where a
  // stage finishes and hands off right as the flow is stopped).
  const rows = await sql<Job>(
    `insert into jobs (id, kind, payload, work_item_id, dedupe_key, max_attempts, run_at)
     select $1::text, $2::text, $3::jsonb, $4::text, $5::text, $6::int,
            now() + ($7::text || ' milliseconds')::interval
     where $4::text is null
        or exists (
          select 1 from work_items
          where id = $4::text and status <> 'stopped' and deleted_at is null
        )
     on conflict (dedupe_key)
       where dedupe_key is not null and status in ('queued', 'running')
       do nothing
     returning *`,
    [
      createId("job"),
      input.kind,
      JSON.stringify(input.payload ?? {}),
      input.workItemId ?? null,
      input.dedupeKey ?? null,
      Math.max(1, input.maxAttempts ?? 1),
      String(Math.max(0, input.delayMs ?? 0)),
    ],
  );
  return rows[0] ?? null;
}

/**
 * Claim up to `limit` ready jobs. Also reclaims jobs whose lease expired
 * (crashed worker) while they still have attempts left.
 */
export async function claimJobs(input: {
  workerId: string;
  limit: number;
  leaseMs: number;
}): Promise<Job[]> {
  if (input.limit <= 0) return [];
  return sql<Job>(
    `with next as (
       select id from jobs
       where (status = 'queued' and run_at <= now())
          or (status = 'running' and locked_until < now() and attempts < max_attempts)
       order by run_at
       limit $2
       for update skip locked
     )
     update jobs j
     set status = 'running',
         locked_by = $1,
         locked_until = now() + ($3::text || ' milliseconds')::interval,
         attempts = j.attempts + 1,
         updated_at = now()
     from next
     where j.id = next.id
     returning j.*`,
    [input.workerId, input.limit, String(input.leaseMs)],
  );
}

export async function extendLease(
  jobId: string,
  workerId: string,
  leaseMs: number,
): Promise<void> {
  await sql(
    `update jobs
     set locked_until = now() + ($3::text || ' milliseconds')::interval
     where id = $1 and locked_by = $2 and status = 'running'`,
    [jobId, workerId, String(leaseMs)],
  );
}

export async function completeJob(jobId: string): Promise<void> {
  await sql(
    `update jobs
     set status = 'succeeded', locked_by = null, locked_until = null, updated_at = now()
     where id = $1 and status = 'running'`,
    [jobId],
  );
}

/** Put the job back in the queue (polling). Does not consume an attempt. */
export async function rescheduleJob(
  jobId: string,
  delayMs: number,
  payload?: Record<string, unknown>,
): Promise<void> {
  await sql(
    `update jobs
     set status = 'queued',
         attempts = 0,
         run_at = now() + ($2::text || ' milliseconds')::interval,
         payload = coalesce($3::jsonb, payload),
         locked_by = null,
         locked_until = null,
         updated_at = now()
     where id = $1 and status = 'running'`,
    [jobId, String(Math.max(0, delayMs)), payload ? JSON.stringify(payload) : null],
  );
}

/** Record a failure; retries with exponential backoff while attempts remain. */
export async function failJob(job: Job, error: string): Promise<"retry" | "failed"> {
  const retry = job.attempts < job.max_attempts;
  const backoffMs = Math.min(5 * 60_000, 2 ** job.attempts * 5_000);
  await sql(
    `update jobs
     set status = $2,
         last_error = $3,
         run_at = case when $2 = 'queued'
                       then now() + ($4::text || ' milliseconds')::interval
                       else run_at end,
         locked_by = null,
         locked_until = null,
         updated_at = now()
     where id = $1 and status = 'running'`,
    [job.id, retry ? "queued" : "failed", error.slice(0, 4000), String(backoffMs)],
  );
  return retry ? "retry" : "failed";
}

/**
 * Cancel every queued or running job for a work item. Running handlers see
 * the change through `getJobStatus` and abort; their late writes are ignored.
 */
export async function cancelJobsForWorkItem(
  workItemId: string,
  reason: string,
): Promise<Job[]> {
  return sql<Job>(
    `update jobs
     set status = 'cancelled',
         last_error = $2,
         locked_by = null,
         locked_until = null,
         updated_at = now()
     where work_item_id = $1 and status in ('queued', 'running')
     returning *`,
    [workItemId, reason.slice(0, 4000)],
  );
}

/** True while `workerId` still owns the job as running. */
export async function jobStillOwned(
  jobId: string,
  workerId: string,
): Promise<boolean> {
  const rows = await sql<{ id: string }>(
    `select id from jobs where id = $1 and status = 'running' and locked_by = $2`,
    [jobId, workerId],
  );
  return Boolean(rows[0]);
}

/** Mark crashed jobs with no attempts left as failed. Returns them. */
export async function sweepExpiredJobs(): Promise<Job[]> {
  return sql<Job>(
    `update jobs
     set status = 'failed',
         last_error = 'Worker lease expired (process crashed or was stopped).',
         locked_by = null,
         locked_until = null,
         updated_at = now()
     where status = 'running' and locked_until < now() and attempts >= max_attempts
     returning *`,
  );
}

export async function hasActiveJobForWorkItem(workItemId: string): Promise<boolean> {
  const rows = await sql<{ n: number }>(
    `select count(*)::int as n from jobs
     where work_item_id = $1 and status in ('queued', 'running')`,
    [workItemId],
  );
  return (rows[0]?.n ?? 0) > 0;
}

/**
 * Cheap change marker for live refresh: the latest write touching an item
 * (or every item in a process), plus whether background work is in flight.
 */
export async function workActivity(
  scope: { workItemId: string } | { processId: string },
): Promise<{ stamp: string; active: boolean }> {
  const byItem = "workItemId" in scope;
  const filter = byItem
    ? "work_item_id = $1"
    : "work_item_id in (select id from work_items where process_id = $1)";
  const id = byItem ? scope.workItemId : scope.processId;
  const rows = await sql<{ stamp: string | null; active: number }>(
    `select greatest(
       (select max(updated_at) from work_items where ${byItem ? "id = $1" : "process_id = $1"}),
       (select max(updated_at) from jobs where ${filter}),
       (select max(created_at) from stage_run_events where ${filter}),
       (select max(created_at) from messages where ${filter}),
       (select max(updated_at) from agent_runs where ${filter})
     )::text as stamp,
     (select count(*)::int from jobs
      where ${filter} and status in ('queued', 'running')) as active`,
    [id],
  );
  return { stamp: rows[0]?.stamp ?? "", active: (rows[0]?.active ?? 0) > 0 };
}
