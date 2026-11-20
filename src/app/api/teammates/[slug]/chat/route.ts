import { getIdentity } from "../../../../../../cursor/identity";
import { getTeammateBySlug } from "@/lib/teammates/registry";
import { runTeammateTurn } from "@/lib/teammates/runtime";

export const runtime = "nodejs";

type ChatBody = {
  message?: string;
  sessionId?: string | null;
  continuationToken?: string | null;
};

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const identity = await getIdentity(request);
  const viewer =
    identity.verified && identity.kind === "person"
      ? { sub: identity.sub }
      : process.env.VERCEL || process.env.CONSOL_DEMO_AUTH === "1"
        ? { sub: "user:demo" }
        : null;

  if (!viewer) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;
  const teammate = await getTeammateBySlug(slug);
  if (!teammate) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  const body = (await request.json()) as ChatBody;
  const message = body.message?.trim() ?? "";
  if (!message) {
    return Response.json({ error: "message required" }, { status: 400 });
  }

  const result = await runTeammateTurn({
    teammate,
    message,
    sessionId: body.sessionId,
    continuationToken: body.continuationToken,
  });

  return Response.json(result);
}
