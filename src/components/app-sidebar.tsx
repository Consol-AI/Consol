"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  FolderKanban,
  Home,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV: {
  href: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
}[] = [
  { href: "/app", label: "Home", icon: Home, exact: true },
  { href: "/app#projects", label: "Projects", icon: FolderKanban },
  { href: "/app#teammates", label: "Teammates", icon: Users },
];

export function AppSidebar({
  orgName,
  viewerName,
}: {
  orgName: string;
  viewerName: string;
}) {
  const pathname = usePathname();

  return (
    <aside className="console-sidebar flex w-[220px] shrink-0 flex-col border-r border-[var(--console-line)] bg-[var(--console-sidebar)]">
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-[var(--console-accent)] text-white shadow-sm">
          <Bot className="size-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <Link
            href="/app"
            className="block truncate text-sm font-semibold tracking-tight text-[var(--console-ink)]"
          >
            Consol
          </Link>
          <p className="truncate text-[11px] text-[var(--console-muted)]">
            {orgName}
          </p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-2 py-2">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href.split("#")[0]!) &&
              pathname !== "/app";
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                pathname === "/app" && item.exact
                  ? "bg-[var(--console-accent-soft)] font-medium text-[var(--console-accent)]"
                  : "text-[var(--console-muted)] hover:bg-[var(--console-hover)] hover:text-[var(--console-ink)]",
                active && !item.exact && "bg-[var(--console-hover)] text-[var(--console-ink)]",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-transform group-hover:scale-105",
                  pathname === "/app" && item.exact && "text-[var(--console-accent)]",
                )}
                aria-hidden
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[var(--console-line)] px-3 py-3">
        <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1">
          <div className="flex size-8 items-center justify-center rounded-full bg-[var(--console-accent-soft)] text-xs font-semibold text-[var(--console-accent)]">
            {viewerName
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--console-ink)]">
              {viewerName}
            </p>
            <p className="truncate text-[11px] text-[var(--console-muted)]">
              You
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
