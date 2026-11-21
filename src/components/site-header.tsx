import Link from "next/link";
import { FactoryEnterLink } from "@/components/factory-enter-link";
import type { AppViewer } from "@/lib/auth";

export function SiteHeader({
  viewer,
  compact = false,
}: {
  viewer?: AppViewer | null;
  compact?: boolean;
}) {
  return (
    <header
      className={
        compact
          ? "flex items-center justify-between border-b border-[var(--line)] px-4 py-3 md:px-6"
          : "absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 py-5 md:px-10"
      }
    >
      <Link
        href={viewer ? "/app" : "/"}
        className="font-[family-name:var(--font-display)] text-2xl tracking-tight md:text-3xl"
      >
        Consol
      </Link>
      <nav className="flex items-center gap-3 text-sm">
        {viewer ? (
          <>
            <span className="hidden text-[var(--quiet)] sm:inline">
              {viewer.demo ? `${viewer.name} (demo)` : viewer.name}
            </span>
            <FactoryEnterLink className="rounded-md bg-[var(--ink)] px-3 py-1.5 text-[var(--paper)]">
              Workspace
            </FactoryEnterLink>
          </>
        ) : (
          <FactoryEnterLink className="rounded-md bg-[var(--ink)] px-3 py-1.5 text-[var(--paper)]">
            Open factory
          </FactoryEnterLink>
        )}
      </nav>
    </header>
  );
}
