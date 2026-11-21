import { cn } from "@/lib/utils";

/** Pulsing status dot for work that is actively in flight. Inherits text color. */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("relative flex size-2 shrink-0", className)}>
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60 motion-reduce:animate-none" />
      <span className="relative inline-flex size-2 rounded-full bg-current" />
    </span>
  );
}
