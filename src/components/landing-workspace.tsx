/** Full-bleed product proof for the hero — mirrors the real Consol console. */
export function LandingWorkspace() {
  return (
    <div
      aria-hidden
      className="landing-workspace flex h-full min-h-[420px] w-full overflow-hidden border-t border-[var(--console-line)] bg-[var(--console-bg)] md:min-h-[540px]"
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
        <div className="flex items-start justify-between gap-4 border-b border-[var(--console-line)] px-4 py-3 md:px-6 md:py-4">
          <div>
            <p className="text-[12px] text-[var(--console-faint)]">Northwind</p>
            <div className="mt-1 flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-md bg-[var(--console-agent)] text-[var(--console-accent)]">
                <svg
                  viewBox="0 0 16 16"
                  className="size-3.5"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M8 2.5 9.2 6h3.5L9.9 8.3l1.1 3.5L8 9.7l-3 1.1 1.1-3.5L3.3 6H6.8L8 2.5Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <div>
                <p className="text-[17px] font-semibold tracking-tight text-[var(--console-ink)]">
                  Forge
                </p>
                <p className="text-[12px] text-[var(--console-muted)]">
                  Coordinate decisions across the factory
                </p>
              </div>
            </div>
          </div>
          <p className="hidden shrink-0 pt-1 text-[11px] text-[var(--console-faint)] sm:block">
            3 need you · 2 agents · 4 projects
          </p>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="landing-chat-rise mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-3 px-4 py-5 md:px-6">
              <div className="ml-8 rounded-xl bg-[var(--console-ink)] px-3.5 py-2.5 text-[13px] leading-relaxed text-white">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.06em] opacity-60">
                  You
                </p>
                What needs a decision before we ship checkout?
              </div>
              <div className="landing-reply mr-8 rounded-xl bg-[var(--console-surface)] px-3.5 py-2.5 text-[13px] leading-relaxed text-[var(--console-ink)] ring-1 ring-[var(--console-line)]">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--console-accent)]">
                  Forge
                </p>
                Three blockers: pricing gate, design sign-off on empty states,
                and funnel drop-off data. I queued owners — want me to draft the
                eng brief?
              </div>
            </div>

            <div className="border-t border-[var(--console-line)] bg-[var(--console-surface)] px-4 py-3 md:px-6">
              <div className="mx-auto flex max-w-[680px] items-center gap-2 rounded-md border border-[var(--console-line)] bg-white px-3 py-2.5">
                <span className="flex-1 truncate text-[13px] text-[var(--console-faint)]">
                  Ask Forge to coordinate a task or decision…
                </span>
                <span className="landing-caret inline-block h-4 w-px shrink-0 bg-[var(--console-ink)]" />
              </div>
            </div>
          </div>

          <aside className="hidden w-[240px] shrink-0 border-l border-[var(--console-line)] bg-[var(--console-surface)] p-4 xl:block">
            <p className="text-[13px] font-semibold text-[var(--console-ink)]">
              Needs attention
            </p>
            <p className="mt-1 text-[11px] leading-snug text-[var(--console-faint)]">
              Decisions waiting across linked lifecycles
            </p>
            <ul className="mt-4">
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
