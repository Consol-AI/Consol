import { cn } from "@/lib/utils";

/** Consol logo mark: indigo→violet tile with a white core. */
export function BrandMark({
  className,
  glow = false,
}: {
  className?: string;
  glow?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-6 shrink-0 place-items-center rounded-md bg-gradient-to-br from-indigo-400 to-violet-600",
        glow && "shadow-[0_0_16px_rgb(129_140_248/0.5)]",
        className,
      )}
    >
      <span className="size-[33%] rounded-[3px] bg-white" />
    </span>
  );
}
