import Link from "next/link";

export function AppMobileBar({
  orgName,
  viewerName,
}: {
  orgName: string;
  viewerName: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--console-line)] bg-[var(--console-sidebar)] px-4 py-3 md:hidden">
      <div>
        <Link
          href="/app"
          className="text-sm font-semibold tracking-tight text-[var(--console-ink)]"
        >
          Consol
        </Link>
        <p className="text-[11px] text-[var(--console-muted)]">{orgName}</p>
      </div>
      <p className="truncate text-xs text-[var(--console-muted)]">{viewerName}</p>
    </div>
  );
}
