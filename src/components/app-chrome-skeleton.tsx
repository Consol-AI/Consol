export function SidebarSkeleton() {
  return (
    <aside
      className="console-sidebar hidden w-[232px] shrink-0 flex-col bg-[var(--console-sidebar)] md:flex"
      aria-hidden
    >
      <div className="px-4 pb-3 pt-5">
        <div className="flex items-center gap-2.5">
          <div className="size-7 animate-pulse rounded-md bg-[var(--console-line)]" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-3 w-16 animate-pulse rounded bg-[var(--console-line)]" />
            <div className="h-2.5 w-24 animate-pulse rounded bg-[var(--console-panel)]" />
          </div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1.5 px-2.5 pt-1">
        <div className="mb-1.5 h-2.5 w-10 animate-pulse rounded bg-[var(--console-panel)] px-2.5" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-8 animate-pulse rounded-md bg-[var(--console-panel)]/80"
          />
        ))}
      </nav>
    </aside>
  );
}

export function MobileBarSkeleton() {
  return (
    <div
      className="flex items-center justify-between bg-[var(--console-sidebar)] px-4 py-3 ring-1 ring-[var(--console-line)] md:hidden"
      aria-hidden
    >
      <div className="flex items-center gap-2.5">
        <div className="size-7 animate-pulse rounded-md bg-[var(--console-line)]" />
        <div className="space-y-1.5">
          <div className="h-3 w-14 animate-pulse rounded bg-[var(--console-line)]" />
          <div className="h-2.5 w-20 animate-pulse rounded bg-[var(--console-panel)]" />
        </div>
      </div>
    </div>
  );
}
