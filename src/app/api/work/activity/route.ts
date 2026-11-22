import { getViewer } from "@/lib/auth";
import { assertProcessAccess, getWorkItem } from "@/lib/factory";
import { workActivity } from "@/lib/jobs/queue";

export const runtime = "nodejs";

/**
 * Read-only change marker for live refresh. The worker does the actual work;
 * the browser only asks "did anything change?".
 */
export async function GET(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const workItemId = params.get("itemId");
  const processId = params.get("processId");

  if (workItemId) {
    const item = await getWorkItem(workItemId);
    if (!item) return Response.json({ error: "not found" }, { status: 404 });
    if (!(await assertProcessAccess(item.process_id, viewer.sub))) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
    return Response.json(await workActivity({ workItemId }));
  }

  if (processId) {
    if (!(await assertProcessAccess(processId, viewer.sub))) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
    return Response.json(await workActivity({ processId }));
  }

  return Response.json({ error: "itemId or processId required" }, { status: 400 });
}
