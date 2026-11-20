import Link from "next/link";

export function AppMobileBar({
  orgName,
  viewerName,
}: {
  orgName: string;
  viewerName: string;
}) {
  return (
    <div className="flex items-center justify-between bg-[var(--console-sidebar)] px-4 py-3 ring-1 ring-[var(--console-line)] md:hidden">
      <div className="flex items-center gap-2.5">
        <span className="flex size-7 items-center justify-center rounded-md bg-[var(--console-ink)] text-[11px] font-semibold text-white">
          C
        </span>
        <div>
          <Link
            href="/app"
            className="text-[13px] font-semibold text-[var(--console-ink)]"
          >
            Consol
          </Link>
          <p className="text-[11px] text-[var(--console-faint)]">{orgName}</p>
        </div>
      </div>
      <p className="truncate text-[12px] text-[var(--console-muted)]">
        {viewerName}
      </p>
    </div>
  );
}
