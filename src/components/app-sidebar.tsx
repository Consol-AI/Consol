"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Cable,
  FolderKanban,
  GitBranch,
  Home,
  Users,
} from "lucide-react";
import { NavPending } from "@/components/nav-pending";
import { cn } from "@/lib/utils";

const NAV: {
  href: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
}[] = [
  { href: "/app", label: "Home", icon: Home, exact: true },
  { href: "/app/work", label: "Work", icon: Briefcase },
  { href: "/app/projects", label: "Projects", icon: FolderKanban },
  { href: "/app/flows", label: "Flows", icon: GitBranch },
  { href: "/app/connectors", label: "Connectors", icon: Cable },
  { href: "/app/teammates", label: "Teammates", icon: Users },
];

export function AppSidebar({
  orgName,
  viewerName,
}: {
  orgName: string;
  viewerName: string;
}) {
  const pathname = usePathname();
  const initials = viewerName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="console-sidebar flex w-[232px] shrink-0 flex-col bg-[var(--console-sidebar)]">
      <div className="px-4 pb-3 pt-5">
        <Link href="/app" className="group flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-md bg-[var(--console-ink)] text-[11px] font-semibold tracking-tight text-white transition group-hover:bg-[var(--console-accent)]">
            C
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold text-[var(--console-ink)]">
              Consol
            </span>
            <span className="block truncate text-[11px] text-[var(--console-faint)]">
              {orgName}
            </span>
          </span>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-2.5 pt-1">
        <p className="mb-1.5 px-2.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--console-faint)]">
          Menu
        </p>
        {NAV.map((item) => {
          const isHome = Boolean(item.exact) && pathname === "/app";
          const isActive =
            isHome ||
            (!item.exact &&
              item.href.startsWith("/app/") &&
              (pathname === item.href || pathname.startsWith(`${item.href}/`)));
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-[7px] text-[13px] transition-colors",
                isActive
                  ? "bg-white font-medium text-[var(--console-ink)] shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)]"
                  : "text-[var(--console-muted)] hover:bg-white/70 hover:text-[var(--console-ink)]",
              )}
            >
              <Icon
                className={cn(
                  "size-[15px] shrink-0",
                  isActive ? "text-[var(--console-accent)]" : "opacity-70",
                )}
                aria-hidden
              />
              {item.label}
              <NavPending />
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4 pt-2">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div className="flex size-7 items-center justify-center rounded-full bg-[var(--console-panel)] text-[10px] font-semibold text-[var(--console-ink)] ring-1 ring-[var(--console-line)]">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-medium text-[var(--console-ink)]">
              {viewerName}
            </p>
            <p className="truncate text-[11px] text-[var(--console-faint)]">
              Signed in
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
