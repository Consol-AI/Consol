import Link from "next/link";
import { Columns3, List } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProcessViewMode = "list" | "board";

type Props = {
  productId: string;
  processId: string;
  view: ProcessViewMode;
};

export function ProcessViewToggle({ productId, processId, view }: Props) {
  const base = `/app/products/${productId}/processes/${processId}`;
  return (
    <div className="inline-flex rounded-lg bg-[var(--console-panel)] p-0.5 ring-1 ring-[var(--console-line)]">
      <Link
        href={base}
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium transition",
          view === "list"
            ? "bg-[var(--console-surface)] text-[var(--console-ink)] shadow-[var(--console-shadow)]"
            : "text-[var(--console-muted)] hover:text-[var(--console-ink)]",
        )}
      >
        <List className="size-3.5" />
        List
      </Link>
      <Link
        href={`${base}?view=board`}
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium transition",
          view === "board"
            ? "bg-[var(--console-surface)] text-[var(--console-ink)] shadow-[var(--console-shadow)]"
            : "text-[var(--console-muted)] hover:text-[var(--console-ink)]",
        )}
      >
        <Columns3 className="size-3.5" />
        Board
      </Link>
    </div>
  );
}
