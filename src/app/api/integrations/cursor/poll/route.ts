import { getIdentity } from "../../../../../../cursor/identity";
import {
  assertOrgAccess,
  assertProductAccess,
  getProcess,
  getWorkItem,
} from "@/lib/factory";
import {
  pollAllActiveAgentRuns,
  pollWorkItemAgentRuns,
} from "@/lib/integrations/cursor/poll";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const identity = await getIdentity(request);
  const viewer =
    identity.verified && identity.kind === "person"
      ? {
          sub: identity.sub,
          name: identity.name || identity.email || "Teammate",
        }
      : process.env.VERCEL || process.env.CONSOL_DEMO_AUTH === "1"
        ? { sub: "user:demo", name: "Demo Teammate" }
        : null;

  if (!viewer) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    workItemId?: string;
    organizationId?: string;
  };

  if (body.workItemId) {
    const item = await getWorkItem(body.workItemId);
    if (!item) return Response.json({ error: "not found" }, { status: 404 });
    const process = await getProcess(item.process_id);
    if (!process) return Response.json({ error: "not found" }, { status: 404 });
    const product = await assertProductAccess(process.product_id, viewer.sub);
    if (!product) return Response.json({ error: "forbidden" }, { status: 403 });

    const results = await pollWorkItemAgentRuns(item.id, viewer.sub);
    return Response.json({
      results: results.map((r) => ({
        runId: r.run.id,
        status: r.run.status,
        prUrl: r.run.pr_url,
        agentUrl: r.run.agent_url,
        changed: r.changed,
        advanced: r.advanced,
        summary: r.summary,
      })),
    });
  }

  // Org-wide poll of active runs (used by overview refresh).
  if (body.organizationId) {
    const ok = await assertOrgAccess(body.organizationId, viewer.sub);
    if (!ok) return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const results = await pollAllActiveAgentRuns(viewer.sub);
  return Response.json({
    results: results.map((r) => ({
      runId: r.run.id,
      workItemId: r.run.work_item_id,
      status: r.run.status,
      prUrl: r.run.pr_url,
      agentUrl: r.run.agent_url,
      changed: r.changed,
      advanced: r.advanced,
      summary: r.summary,
    })),
  });
}
