import Link from "next/link";
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
        className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[var(--landing-ink)] md:text-2xl"
      >
        Consol
      </Link>
      <nav className="flex items-center gap-5 text-sm">
        {!compact && (
          <>
            <a
              href="#how"
              className="hidden text-[var(--landing-quiet)] transition hover:text-[var(--landing-ink)] md:inline"
            >
              How it works
            </a>
            <a
              href="#faq"
              className="hidden text-[var(--landing-quiet)] transition hover:text-[var(--landing-ink)] lg:inline"
            >
              FAQ
            </a>
          </>
        )}
        <Link
          href="/app"
          className="rounded-md bg-[var(--landing-accent)] px-3.5 py-1.5 font-medium text-white transition hover:bg-[var(--landing-accent-hover)]"
        >
          {viewer ? "Workspace" : "Get started"}
        </Link>
      </nav>
    </header>
  );
}
