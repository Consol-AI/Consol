export function PageLoading() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col px-5 py-5 md:px-8 md:py-6"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="h-3 w-16 animate-pulse rounded bg-[var(--console-line)]" />
      <div className="mt-3 h-7 w-48 animate-pulse rounded-md bg-[var(--console-line)]" />
      <div className="mt-2 h-4 w-72 max-w-full animate-pulse rounded bg-[var(--console-panel)]" />
      <div className="mt-8 flex-1 overflow-hidden rounded-xl bg-[var(--console-surface)] shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)]">
        <div className="space-y-3 p-5">
          <div className="h-10 animate-pulse rounded-lg bg-[var(--console-panel)]" />
          <div className="h-10 animate-pulse rounded-lg bg-[var(--console-panel)]" />
          <div className="h-10 w-[80%] animate-pulse rounded-lg bg-[var(--console-panel)]" />
          <div className="h-10 w-[60%] animate-pulse rounded-lg bg-[var(--console-panel)]" />
        </div>
      </div>
    </div>
  );
}
