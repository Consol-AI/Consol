/**
 * Starts the job worker inside the Next server when running inline.
 *
 * CONSOL_WORKER=inline  always run the worker in this process
 * CONSOL_WORKER=off     never (a separate `npm run worker` process handles jobs)
 * unset                 inline when there is no DATABASE_URL (PGlite is
 *                       single-process, so the worker must share it)
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Never run jobs while `next build` prerenders pages.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const mode = process.env.CONSOL_WORKER?.trim().toLowerCase();
  const inline =
    mode === "inline" || (!mode && !process.env.DATABASE_URL?.trim());
  if (!inline) return;

  const globalForWorker = globalThis as typeof globalThis & {
    __consolWorkerStarted?: boolean;
  };
  // Dev reloads can re-run register(); keep a single worker per process.
  if (globalForWorker.__consolWorkerStarted) return;
  globalForWorker.__consolWorkerStarted = true;

  const { startWorker } = await import("@/lib/jobs/worker");
  startWorker({ concurrency: 2 });
}
