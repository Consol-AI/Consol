import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { FactoryEnterLink } from "@/components/factory-enter-link";

const NAV = [
  { href: "#work", label: "Work in progress" },
  { href: "#features", label: "Features" },
  { href: "#history", label: "History" },
  { href: "#faq", label: "FAQ" },
];

/** Marketing header for the public landing page. */
export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.08] bg-zinc-950/70 text-white backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-6 md:px-10">
        <Link
          href="/"
          aria-label="Consol home"
          className="flex items-center gap-2 text-[17px] font-semibold tracking-tight"
        >
          <BrandMark glow />
          Consol
        </Link>
        <nav
          aria-label="Primary"
          className="hidden items-center gap-7 text-sm text-zinc-400 md:flex"
        >
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="transition hover:text-white">
              {item.label}
            </a>
          ))}
        </nav>
        <FactoryEnterLink className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-zinc-950 transition hover:bg-zinc-200">
          Open workspace
        </FactoryEnterLink>
      </div>
    </header>
  );
}
