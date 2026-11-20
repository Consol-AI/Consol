import Link from "next/link";
import type { AppViewer } from "@/lib/auth";
import { cn } from "@/lib/utils";

export function SiteHeader({
  viewer,
  compact = false,
  tone = "default",
}: {
  viewer?: AppViewer | null;
  compact?: boolean;
  /** Use on dark full-bleed heroes so the wordmark stays readable. */
  tone?: "default" | "on-dark";
}) {
  const onDark = tone === "on-dark" && !compact;

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
        className={cn(
          "font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight md:text-3xl",
          onDark && "text-[var(--landing-mist)]",
        )}
      >
        Consol
      </Link>
      <nav className="flex items-center gap-3 text-sm">
        {!compact && (
          <a
            href="#how"
            className={cn(
              "hidden sm:inline",
              onDark
                ? "text-[var(--landing-mist)]/75 transition hover:text-[var(--landing-mist)]"
                : "text-[var(--quiet)] transition hover:text-[var(--ink)]",
            )}
          >
            How it fits
          </a>
        )}
        {viewer ? (
          <>
            <span
              className={cn(
                "hidden sm:inline",
                onDark ? "text-[var(--landing-mist)]/70" : "text-[var(--quiet)]",
              )}
            >
              {viewer.demo ? `${viewer.name} (demo)` : viewer.name}
            </span>
            <Link
              href="/app"
              className={cn(
                "rounded-md px-3 py-1.5 transition",
                onDark
                  ? "bg-[var(--landing-mist)] text-[var(--landing-deep)] hover:bg-white"
                  : "bg-[var(--ink)] text-[var(--paper)]",
              )}
            >
              Workspace
            </Link>
          </>
        ) : (
          <Link
            href="/app"
            className={cn(
              "rounded-md px-3 py-1.5 transition",
              onDark
                ? "bg-[var(--landing-mist)] text-[var(--landing-deep)] hover:bg-white"
                : "bg-[var(--ink)] text-[var(--paper)]",
            )}
          >
            Open factory
          </Link>
        )}
      </nav>
    </header>
  );
}
