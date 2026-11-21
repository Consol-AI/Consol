import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

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
        <BrandMark className="size-7" />
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
