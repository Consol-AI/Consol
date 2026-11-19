import { SiteHeader } from "@/components/site-header";
import { getViewer } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();
  return (
    <div className="min-h-screen">
      <SiteHeader viewer={viewer} compact />
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">{children}</div>
    </div>
  );
}
