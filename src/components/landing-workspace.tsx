/** Full-bleed product plane — mirrors the real Consol console. */
export function LandingWorkspace() {
  return (
    <div
      aria-hidden
      className="landing-workspace flex h-full min-h-[400px] w-full overflow-hidden border-t border-[var(--console-line)] bg-[var(--console-bg)] md:min-h-[520px]"
    >
      <aside className="hidden w-[200px] shrink-0 flex-col border-r border-[var(--console-line)] bg-[var(--console-sidebar)] p-4 md:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-md bg-[var(--console-ink)] text-[11px] font-semibold text-white">
            C
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] font-semibold text-[var(--console-ink)]">
              Consol
            </span>
            <span className="block text-[11px] text-[var(--console-faint)]">
              Northwind
            </span>
          </span>
        </div>
        <p className="mt-6 text-[10px] font-medium tracking-[0.14em] text-[var(--console-faint)]">
          MENU
        </p>
        <div className="mt-2 space-y-1">
          {["Home", "Projects", "Teammates"].map((label, i) => (
            <div
              key={label}
              className={
                i === 0
                  ? "rounded-md bg-[var(--console-hover)] px-2.5 py-1.5 text-[13px] font-medium text-[var(--console-ink)]"
                  : "px-2.5 py-1.5 text-[13px] text-[var(--console-muted)]"
              }
            >
              {label}
            </div>
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--console-line)] px-4 py-3 md:px-5 md:py-4">
          <div>
            <p className="text-[12px] text-[var(--console-faint)]">Northwind</p>
            <div className="mt-1 flex items-center gap-2.5">
              <span className="flex size-6 items-center justify-center rounded-md bg-[var(--console-agent)] text-[10px] font-semibold text-[var(--console-accent)]">
                AI
              </span>
              <div>
                <p className="text-[17px] font-semibold tracking-tight text-[var(--console-ink)]">
                  Forge
                </p>
                <p className="text-[12px] text-[var(--console-muted)]">
                  Coordinate tasks and decisions across the factory
                </p>
              </div>
            </div>
          </div>
          <p className="hidden shrink-0 pt-1 text-[11px] text-[var(--console-faint)] sm:block">
            3 need you · 2 agents · 4 projects
          </p>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col px-4 py-4 md:px-5 md:py-5">
            <div className="landing-chat-rise mx-auto flex w-full max-w-[720px] flex-col gap-3">
              <div className="ml-6 rounded-xl bg-[var(--console-ink)] px-3.5 py-2.5 text-[13px] leading-relaxed text-white">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.06em] opacity-60">
                  You
                </p>
                What needs a decision before we ship checkout?
              </div>
              <div className="landing-reply mr-6 rounded-xl bg-[var(--console-surface)] px-3.5 py-2.5 text-[13px] leading-relaxed text-[var(--console-ink)] ring-1 ring-[var(--console-line)]">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--console-muted)]">
                  Forge
                </p>
                Three blockers: pricing experiment gate, design sign-off on empty
                states, and the data check on funnel drop-off. I queued owners
                and can draft the eng brief next.
              </div>
            </div>

            <div className="mt-auto border-t border-[var(--console-line)] bg-[var(--console-surface)] px-0 pt-3">
              <div className="flex items-center gap-2 rounded-md border border-[var(--console-line)] bg-white px-3 py-2.5">
                <span className="flex-1 truncate text-[13px] text-[var(--console-faint)]">
                  Ask Forge to coordinate a task or decision…
                </span>
                <span className="landing-caret inline-block h-4 w-px shrink-0 bg-[var(--console-ink)]" />
              </div>
            </div>
          </div>

          <aside className="hidden w-[230px] shrink-0 border-l border-[var(--console-line)] bg-[var(--console-surface)] p-4 lg:block">
            <p className="text-[13px] font-semibold text-[var(--console-ink)]">
              Needs attention
            </p>
            <p className="mt-1 text-[11px] text-[var(--console-faint)]">
              Decisions and agent work across projects
            </p>
            <ul className="mt-4 space-y-0">
              {[
                { title: "Approve pricing gate", meta: "Product · Human" },
                { title: "Empty-state critique", meta: "Design · Agent" },
                { title: "Funnel drop-off check", meta: "Data · Script" },
              ].map((item) => (
                <li
                  key={item.title}
                  className="border-t border-[var(--console-line)] py-3"
                >
                  <p className="text-[13px] font-medium text-[var(--console-ink)]">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--console-faint)]">
                    {item.meta}
                  </p>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}
