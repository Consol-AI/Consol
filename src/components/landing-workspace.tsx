/** Full-bleed living product plane — denser than a static wireframe. */
export function LandingWorkspace() {
  return (
    <div
      aria-hidden
      className="landing-workspace relative flex h-full min-h-[420px] w-full overflow-hidden border-t border-[var(--landing-ink)]/10 bg-[var(--console-bg)] md:min-h-[560px]"
    >
      <div className="landing-sheen pointer-events-none absolute inset-0 z-[1]" />

      <aside className="hidden w-[196px] shrink-0 border-r border-[var(--console-line)] bg-[var(--console-sidebar)] p-4 md:flex md:flex-col">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-md bg-[var(--landing-ink)] text-[11px] font-semibold text-[var(--landing-signal)]">
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
                  ? "rounded-md bg-[var(--landing-signal)]/25 px-2.5 py-1.5 text-[13px] font-medium text-[var(--landing-ink)]"
                  : "px-2.5 py-1.5 text-[13px] text-[var(--console-muted)]"
              }
            >
              {label}
            </div>
          ))}
        </div>

        <div className="mt-auto space-y-2 border-t border-[var(--console-line)] pt-4">
          <p className="text-[10px] font-medium tracking-[0.12em] text-[var(--console-faint)]">
            LIVE FLOORS
          </p>
          {[
            { name: "Checkout redesign", tone: "active" },
            { name: "Pricing experiment", tone: "wait" },
            { name: "Funnel health", tone: "run" },
          ].map((floor) => (
            <div key={floor.name} className="flex items-center gap-2 text-[12px]">
              <span
                className={
                  floor.tone === "active"
                    ? "landing-dot size-1.5 rounded-full bg-[var(--landing-signal-deep)]"
                    : floor.tone === "run"
                      ? "landing-dot-delay size-1.5 rounded-full bg-[var(--console-accent)]"
                      : "size-1.5 rounded-full bg-[var(--console-faint)]"
                }
              />
              <span className="truncate text-[var(--console-ink)]">{floor.name}</span>
            </div>
          ))}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--console-line)] px-4 py-3 md:px-5 md:py-4">
          <div>
            <p className="text-[12px] text-[var(--console-faint)]">Northwind</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="landing-dot size-2 rounded-sm bg-[var(--landing-signal-deep)]" />
              <p className="text-[17px] font-semibold tracking-tight text-[var(--console-ink)]">
                Forge
              </p>
            </div>
            <p className="mt-0.5 text-[12px] text-[var(--console-muted)]">
              Coordinate tasks and decisions across the factory
            </p>
          </div>
          <div className="hidden shrink-0 gap-4 text-[11px] text-[var(--console-faint)] sm:flex">
            <span>
              <strong className="text-[var(--landing-ink)]">3</strong> need you
            </span>
            <span>
              <strong className="text-[var(--landing-ink)]">2</strong> agents
            </span>
            <span>
              <strong className="text-[var(--landing-ink)]">4</strong> floors
            </span>
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 flex-col px-4 py-4 md:px-5 md:py-5">
            <div className="mb-4 flex flex-wrap gap-2">
              {[
                "What needs my decision today?",
                "Prioritize checkout work",
                "Draft eng brief",
              ].map((chip, i) => (
                <span
                  key={chip}
                  className="landing-chip rounded-md border border-[var(--console-line)] bg-white px-2.5 py-1 text-[11px] text-[var(--console-muted)]"
                  style={{ animationDelay: `${0.35 + i * 0.08}s` }}
                >
                  {chip}
                </span>
              ))}
            </div>

            <div className="landing-chat-rise space-y-3">
              <div className="max-w-[92%] rounded-md bg-[var(--landing-ink)] px-3 py-2 text-[13px] leading-relaxed text-white md:max-w-[80%]">
                What needs a decision before we ship checkout?
              </div>
              <div className="landing-reply max-w-[95%] rounded-md border border-[var(--console-line)] bg-white px-3 py-2.5 text-[13px] leading-relaxed text-[var(--console-ink)] md:max-w-[88%]">
                <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-[var(--landing-signal-deep)]">
                  <span className="landing-dot size-1.5 rounded-full bg-[var(--landing-signal-deep)]" />
                  Forge
                </span>
                Three blockers: pricing experiment gate, design sign-off on empty
                states, and the data check on funnel drop-off. I queued owners
                and can draft the eng brief next.
              </div>
            </div>

            <div className="mt-auto border-t border-[var(--console-line)] pt-4">
              <div className="flex items-center gap-2 rounded-md border border-[var(--landing-ink)]/15 bg-white px-3 py-2.5 shadow-[inset_3px_0_0_var(--landing-signal)]">
                <span className="flex-1 truncate text-[13px] text-[var(--console-faint)]">
                  Ask Forge to coordinate a task or decision…
                </span>
                <span className="landing-caret inline-block h-4 w-px shrink-0 bg-[var(--landing-ink)]" />
              </div>
            </div>
          </div>

          <aside className="hidden w-[240px] shrink-0 border-l border-[var(--console-line)] bg-white p-4 lg:block">
            <p className="text-[13px] font-semibold text-[var(--console-ink)]">
              Needs attention
            </p>
            <p className="mt-1 text-[11px] text-[var(--console-faint)]">
              Across linked lifecycles
            </p>
            <ul className="mt-4 space-y-0">
              {[
                {
                  title: "Approve pricing gate",
                  meta: "Product · Human",
                  hot: true,
                },
                {
                  title: "Empty-state critique",
                  meta: "Design · Agent",
                  hot: false,
                },
                {
                  title: "Funnel drop-off check",
                  meta: "Data · Script",
                  hot: false,
                },
                {
                  title: "Ship checklist",
                  meta: "Build · Human",
                  hot: false,
                },
              ].map((item, i) => (
                <li
                  key={item.title}
                  className={`landing-attention border-t border-[var(--console-line)] py-3 ${item.hot ? "landing-attention-hot" : ""}`}
                  style={{ animationDelay: `${0.55 + i * 0.1}s` }}
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
