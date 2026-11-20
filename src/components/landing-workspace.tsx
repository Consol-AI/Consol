/** Edge-to-edge product plane for the hero — mirrors the console UI. */
export function LandingWorkspace() {
  return (
    <div
      aria-hidden
      className="landing-workspace flex h-full min-h-[380px] w-full overflow-hidden border-t border-[var(--console-line)] bg-[var(--console-bg)] md:min-h-[520px]"
    >
      {/* Sidebar */}
      <aside className="hidden w-[200px] shrink-0 border-r border-[var(--console-line)] bg-[var(--console-sidebar)] p-4 md:block">
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

      {/* Forge main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-[var(--console-line)] px-4 py-3 md:px-5 md:py-4">
          <p className="text-[12px] text-[var(--console-faint)]">Northwind</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="size-2 rounded-sm bg-[var(--console-accent)]" />
            <p className="text-[17px] font-semibold tracking-tight text-[var(--console-ink)]">
              Forge
            </p>
          </div>
          <p className="mt-0.5 text-[12px] text-[var(--console-muted)]">
            Coordinate tasks and decisions across the factory
          </p>
        </div>

        <div className="flex flex-1 gap-0 overflow-hidden">
          <div className="flex min-w-0 flex-1 flex-col px-4 py-4 md:px-5 md:py-5">
            <div className="landing-chat-rise space-y-3">
              <div className="max-w-[92%] rounded-md bg-[var(--console-panel)] px-3 py-2 text-[13px] leading-relaxed text-[var(--console-ink)] md:max-w-[85%]">
                What needs a decision before we ship checkout?
              </div>
              <div className="landing-reply max-w-[95%] rounded-md border border-[var(--console-line)] bg-[var(--console-surface)] px-3 py-2 text-[13px] leading-relaxed text-[var(--console-ink)] md:max-w-[90%]">
                <span className="mb-1 block text-[11px] font-medium text-[var(--console-accent)]">
                  Forge
                </span>
                Three items: pricing experiment gate, design sign-off on empty
                states, and the data check on funnel drop-off. I can draft the
                brief for engineering once you pick an owner.
              </div>
            </div>

            <div className="mt-auto border-t border-[var(--console-line)] pt-4">
              <div className="flex items-center gap-2 rounded-md border border-[var(--console-line)] bg-white px-3 py-2.5">
                <span className="flex-1 truncate text-[13px] text-[var(--console-faint)]">
                  Ask Forge to coordinate a task or decision…
                </span>
                <span className="landing-caret inline-block h-4 w-px shrink-0 bg-[var(--console-ink)]" />
              </div>
            </div>
          </div>

          <aside className="hidden w-[220px] shrink-0 border-l border-[var(--console-line)] bg-[var(--console-surface)] p-4 lg:block">
            <p className="text-[13px] font-semibold text-[var(--console-ink)]">
              Needs attention
            </p>
            <p className="mt-1 text-[11px] text-[var(--console-faint)]">
              Across linked lifecycles
            </p>
            <ul className="mt-4 space-y-3">
              {[
                { title: "Approve pricing gate", meta: "Product · Human" },
                { title: "Empty-state critique", meta: "Design · Agent" },
                { title: "Funnel drop-off check", meta: "Data · Script" },
              ].map((item) => (
                <li
                  key={item.title}
                  className="border-t border-[var(--console-line)] pt-3"
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
