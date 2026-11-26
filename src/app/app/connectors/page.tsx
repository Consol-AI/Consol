import { ConnectorsCatalog } from "@/components/connectors-catalog";
import { getViewer } from "@/lib/auth";
import { ensureWorkspace } from "@/lib/factory";
import { listConnectors } from "@/lib/integrations/catalog";
import { listOrganizationConnections } from "@/lib/integrations/connections";
import { hasTextModel } from "@/lib/models";

export default async function ConnectorsPage() {
  const viewer = await getViewer();
  if (!viewer) {
    return (
      <div className="m-6 rounded-xl bg-[var(--console-surface)] p-8 text-center shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)] md:m-10">
        <h1 className="text-[22px] font-semibold tracking-tight text-[var(--console-ink)]">
          Sign in required
        </h1>
        <p className="mt-2 text-[13px] text-[var(--console-muted)]">
          Set{" "}
          <code className="rounded bg-[var(--console-panel)] px-1.5 py-0.5 text-[12px]">
            CONSOL_DEMO_AUTH=1
          </code>{" "}
          locally, or publish the app to continue.
        </p>
      </div>
    );
  }

  const org = await ensureWorkspace(viewer);
  const connections = await listOrganizationConnections(org.id);
  const connectedCounts: Record<string, number> = {};
  for (const row of connections) {
    if (row.status !== "connected") continue;
    connectedCounts[row.provider] = 1;
  }
  if (hasTextModel()) connectedCounts.models = 1;

  return (
    <ConnectorsCatalog
      connectors={listConnectors()}
      connectedCounts={connectedCounts}
    />
  );
}
