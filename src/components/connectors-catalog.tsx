import Link from "next/link";
import {
  Bot,
  Cable,
  GitPullRequest,
  MessageSquare,
  SquareKanban,
} from "lucide-react";
import type { ConnectorDefinition } from "@/lib/integrations/catalog";
import { cn } from "@/lib/utils";

function connectorIcon(key: string) {
  if (key === "github") return GitPullRequest;
  if (key === "cursor") return Bot;
  if (key === "linear") return SquareKanban;
  if (key === "slack") return MessageSquare;
  return Cable;
}

type Props = {
  connectors: ConnectorDefinition[];
  connectedCounts: Record<string, number>;
};

export function ConnectorsCatalog({ connectors, connectedCounts }: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="px-5 py-5 md:px-8 md:py-6">
        <div className="animate-rise min-w-0">
          <p className="text-[12px] text-[var(--console-faint)]">Integrations</p>
          <h1 className="mt-0.5 text-[22px] font-semibold tracking-tight text-[var(--console-ink)]">
            Connectors
          </h1>
          <p className="mt-1 max-w-xl text-[13px] text-[var(--console-muted)]">
            Wire external systems into your factory so flows can open PRs,
            sync issues, and notify the team.
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-5 pb-8 md:px-8">
        <div className="animate-rise-delay mx-auto max-w-[720px] overflow-hidden rounded-xl bg-[var(--console-surface)] shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)]">
          <ul className="divide-y divide-[var(--console-line)]">
            {connectors.map((connector) => {
              const Icon = connectorIcon(connector.key);
              const count = connectedCounts[connector.key] ?? 0;
              const inner = (
                <div className="flex items-start gap-3 px-4 py-4">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--console-panel)] text-[var(--console-ink)] ring-1 ring-[var(--console-line)]">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[14px] font-semibold tracking-tight text-[var(--console-ink)]">
                        {connector.name}
                      </h2>
                      <span className="text-[11px] uppercase tracking-[0.06em] text-[var(--console-faint)]">
                        {connector.category}
                      </span>
                      {connector.available ? (
                        count > 0 ? (
                          <span className="rounded-md bg-[var(--console-accent-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--console-accent)]">
                            Connected
                          </span>
                        ) : (
                          <span className="rounded-md bg-[var(--console-panel)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--console-muted)]">
                            Available
                          </span>
                        )
                      ) : (
                        <span className="rounded-md bg-[var(--console-panel)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--console-muted)]">
                          Coming soon
                        </span>
                      )}
                    </div>
                    <p className="mt-1 max-w-xl text-[12px] text-[var(--console-muted)]">
                      {connector.description}
                    </p>
                    <p className="mt-2 text-[11px] text-[var(--console-faint)]">
                      {connector.actions.join(" · ")}
                    </p>
                  </div>
                </div>
              );

              return (
                <li key={connector.key}>
                  {connector.available ? (
                    <Link
                      href={connector.href}
                      className={cn(
                        "block transition hover:bg-[var(--console-hover)]",
                      )}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <div className="opacity-70">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
