import { revalidatePath } from "next/cache";
import { getRequestViewer } from "@/lib/auth";
import { confirmProposal } from "@/lib/proposals";

export const runtime = "nodejs";

type ConfirmBody = {
  flowKey?: unknown;
  inputs?: unknown;
};

/**
 * Start the proposed work with the user's final fields. Idempotent on the
 * proposal id: retries return the existing work item.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const viewer = await getRequestViewer(request);
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await context.params;

  const body = (await request.json().catch(() => ({}))) as ConfirmBody;
  const flowKey = typeof body.flowKey === "string" ? body.flowKey : "";
  const inputs: Record<string, string> = {};
  if (body.inputs && typeof body.inputs === "object") {
    for (const [key, value] of Object.entries(body.inputs)) {
      if (typeof value === "string") inputs[key] = value;
    }
  }

  const result = await confirmProposal({
    id,
    viewerSub: viewer.sub,
    flowKey,
    inputs,
  });
  if (!result.ok) {
    return Response.json(
      { error: result.error, proposal: result.proposal ?? null },
      { status: result.status },
    );
  }

  if (result.proposal.work_item) {
    revalidatePath("/app");
    revalidatePath("/app/work");
    revalidatePath(result.proposal.work_item.href);
  }
  return Response.json({
    proposal: result.proposal,
    message: result.message ?? null,
  });
}
