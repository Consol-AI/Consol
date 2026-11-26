import { getRequestViewer } from "@/lib/auth";
import { getProposalForViewer } from "@/lib/proposals";

export const runtime = "nodejs";

/** Current proposal state, including the started work item's stage/status. */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const viewer = await getRequestViewer(request);
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const result = await getProposalForViewer(id, viewer.sub);
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }
  return Response.json({ proposal: result.proposal });
}
