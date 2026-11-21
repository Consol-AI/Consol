"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

function EnterLabel({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();
  return (
    <span className="inline-flex items-center gap-2">
      {pending ? "Opening…" : children}
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full bg-current opacity-0 transition-opacity duration-150",
          pending && "animate-pulse opacity-70",
        )}
      />
    </span>
  );
}

/** Primary CTA into `/app` with immediate pending feedback. */
export function FactoryEnterLink({
  className,
  children = "Enter your factory",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Link href="/app" className={className} prefetch>
      <EnterLabel>{children}</EnterLabel>
    </Link>
  );
}
