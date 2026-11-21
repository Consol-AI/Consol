import { Suspense } from "react";
import { AppMobileBar } from "@/components/app-mobile-bar";
import {
  MobileBarSkeleton,
  SidebarSkeleton,
} from "@/components/app-chrome-skeleton";
import { AppSidebar } from "@/components/app-sidebar";
import { getViewer } from "@/lib/auth";
import { ensureWorkspace } from "@/lib/factory";

async function DesktopSidebar() {
  const viewer = await getViewer();
  if (!viewer) return null;
  const org = await ensureWorkspace(viewer);
  return (
    <div className="hidden md:flex">
      <AppSidebar orgName={org.name} viewerName={viewer.name} />
    </div>
  );
}

async function MobileChrome() {
  const viewer = await getViewer();
  if (!viewer) return null;
  const org = await ensureWorkspace(viewer);
  return <AppMobileBar orgName={org.name} viewerName={viewer.name} />;
}

/**
 * Sync shell so `/` → `/app` can paint immediately. Auth/workspace work for
 * the chrome streams in behind Suspense; page content uses `loading.tsx`.
 */
export function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="console-shell flex min-h-screen bg-[var(--console-bg)] text-[var(--console-ink)]">
      <Suspense fallback={<SidebarSkeleton />}>
        <DesktopSidebar />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <Suspense fallback={<MobileBarSkeleton />}>
          <MobileChrome />
        </Suspense>
        {children}
      </div>
    </div>
  );
}
