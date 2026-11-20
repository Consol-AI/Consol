import Link from "next/link";
import type { AppViewer } from "@/lib/auth";
import { cn } from "@/lib/utils";

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
        className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--landing-ink)] md:text-3xl"
      >
        Consol
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        {!compact && (
          <a
            href="#how"
            className="hidden text-[var(--landing-quiet)] transition hover:text-[var(--landing-ink)] sm:inline"
          >
            How it fits
          </a>
        )}
        {viewer ? (
          <>
            <span className="hidden text-[var(--landing-quiet)] sm:inline">
              {viewer.demo ? `${viewer.name} (demo)` : viewer.name}
            </span>
            <Link
              href="/app"
              className={cn(
                "rounded-md bg-[var(--landing-ink)] px-3 py-1.5 text-[var(--landing-bg)] transition hover:opacity-90",
              )}
            >
              Workspace
            </Link>
          </>
        ) : (
          <Link
            href="/app"
            className="rounded-md bg-[var(--landing-ink)] px-3 py-1.5 text-[var(--landing-bg)] transition hover:opacity-90"
          >
            Open factory
          </Link>
        )}
      </nav>
    </header>
  );
}
