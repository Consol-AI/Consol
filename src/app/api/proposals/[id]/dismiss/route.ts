import { getRequestViewer } from "@/lib/auth";
import { dismissProposal } from "@/lib/proposals";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const viewer = await getRequestViewer(request);
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const result = await dismissProposal(id, viewer.sub);
  if (!result.ok) {
    return Response.json(
      { error: result.error, proposal: result.proposal ?? null },
      { status: result.status },
    );
  }
  return Response.json({ proposal: result.proposal });
}
