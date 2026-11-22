/**
 * Standalone worker process: `npm run worker` (or the `worker` service in
 * Docker / Railway). Runs flow stages and polls external agent runs.
 */
import { startWorker } from "@/lib/jobs/worker";

if (!process.env.DATABASE_URL?.trim()) {
  console.error(
    "[worker] DATABASE_URL is required. Without it, run `npm run dev` — the worker starts inline next to PGlite.",
  );
  process.exit(1);
}

const worker = startWorker({
  concurrency: Number(process.env.WORKER_CONCURRENCY) || 4,
  pollIntervalMs: Number(process.env.WORKER_POLL_MS) || 1_000,
});

let shuttingDown = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    if (shuttingDown) process.exit(1);
    shuttingDown = true;
    console.log(`[worker] ${signal}: finishing in-flight jobs`);
    void worker.stop().then(() => process.exit(0));
  });
}
