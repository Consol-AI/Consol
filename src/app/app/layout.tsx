import { AppMobileBar } from "@/components/app-mobile-bar";
import { AppSidebar } from "@/components/app-sidebar";
import { getViewer } from "@/lib/auth";
import { ensureWorkspace } from "@/lib/factory";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();
  const org = viewer ? await ensureWorkspace(viewer) : null;

  return (
    <div className="console-shell flex min-h-screen bg-[var(--console-bg)] text-[var(--console-ink)]">
      {viewer && org ? (
        <>
          <div className="hidden md:flex">
            <AppSidebar orgName={org.name} viewerName={viewer.name} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            <AppMobileBar orgName={org.name} viewerName={viewer.name} />
            {children}
          </div>
        </>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      )}
    </div>
  );
}
