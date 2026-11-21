"use client";

import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

/** Inline hint while a parent `<Link>` navigation is pending. */
export function NavPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      className={cn(
        "ml-auto size-1.5 shrink-0 rounded-full bg-[var(--console-accent)] opacity-0 transition-opacity duration-150",
        pending && "animate-pulse opacity-100",
        className,
      )}
    />
  );
}
