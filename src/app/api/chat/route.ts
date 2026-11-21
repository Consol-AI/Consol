import { streamText } from "ai";
import { getIdentity } from "../../../../cursor/identity";
import {
  formatWorkspaceBriefForPrompt,
  getLanguageModel,
  mockAssistantReply,
} from "@/lib/ai";
import {
  addMessage,
  assertOrgAccess,
  assertProcessAccess,
  buildWorkspaceBrief,
  getProcess,
  getWorkItem,
  listStages,
} from "@/lib/factory";

export const runtime = "nodejs";

type ChatBody = {
  message?: string;
  processId?: string;
  workItemId?: string;
  organizationId?: string;
};

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

  const body = (await request.json()) as ChatBody;
  const message = body.message?.trim() ?? "";
  if (!message) {
    return Response.json({ error: "message required" }, { status: 400 });
  }

  let processId = body.processId ?? null;
  let workItemId = body.workItemId ?? null;
  let organizationId = body.organizationId ?? null;
  let contextLabel = "this workspace";
  let stageNames: string[] = [];
  let workspaceBriefText: string | undefined;

  if (workItemId) {
    const item = await getWorkItem(workItemId);
    if (!item) return Response.json({ error: "item not found" }, { status: 404 });
    const process = await assertProcessAccess(item.process_id, viewer.sub);
    if (!process) return Response.json({ error: "forbidden" }, { status: 403 });
    processId = process.id;
    organizationId = process.organization_id;
    contextLabel = `${item.title} (${process.name})`;
    stageNames = (await listStages(process.id)).map((s) => s.name);
  } else if (processId) {
    const process = await assertProcessAccess(processId, viewer.sub);
    if (!process) {
      const missing = await getProcess(processId);
      if (!missing) {
        return Response.json({ error: "process not found" }, { status: 404 });
      }
      return Response.json({ error: "forbidden" }, { status: 403 });
    }
    organizationId = process.organization_id;
    contextLabel = process.name;
    stageNames = (await listStages(process.id)).map((s) => s.name);
  } else if (organizationId) {
    const ok = await assertOrgAccess(organizationId, viewer.sub);
    if (!ok) return Response.json({ error: "forbidden" }, { status: 403 });
    const brief = await buildWorkspaceBrief(organizationId);
    workspaceBriefText = formatWorkspaceBriefForPrompt(brief);
    contextLabel = "your factory floor";
  } else {
    return Response.json({ error: "context required" }, { status: 400 });
  }

  await addMessage({
    organizationId,
    processId,
    workItemId,
    role: "user",
    content: message,
    authorSub: viewer.sub,
    authorName: viewer.name,
  });

  const model = getLanguageModel();
  if (!model) {
    const reply = mockAssistantReply({
      userMessage: message,
      contextLabel,
      stageNames,
      workspaceBrief: workspaceBriefText,
    });
    await addMessage({
      organizationId,
      processId,
      workItemId,
      role: "assistant",
      content: reply,
      authorName: "Forge AI",
    });
    return Response.json({ reply, mock: true });
  }

  const system = workspaceBriefText
    ? [
        "You are Forge, the AI coordinator on the Consol product-factory home screen.",
        "Help the user coordinate tasks and decisions across projects, processes, and teammates.",
        "Be concrete and concise. Surface what needs a human decision first, then agent work, then waiting items.",
        "When useful, point to a project or work item by name and suggest the next decision or handoff.",
        "Do not invent work that is not in the workspace brief unless the user asks to draft something new.",
        "",
        `Workspace brief:\n${workspaceBriefText}`,
      ].join("\n")
    : [
        "You are Forge, an AI collaborator inside a product factory workspace.",
        "Help cross-functional teams move work through professional lifecycles.",
        `Current context: ${contextLabel}.`,
        stageNames.length ? `Lifecycle stages: ${stageNames.join(" → ")}.` : "",
        "Be concrete, concise, and actionable. Prefer short structured answers.",
      ]
        .filter(Boolean)
        .join(" ");

  const result = streamText({
    model,
    system,
    prompt: message,
    onFinish: async ({ text }) => {
      await addMessage({
        organizationId,
        processId,
        workItemId,
        role: "assistant",
        content: text,
        authorName: "Forge AI",
      });
    },
  });

  return result.toTextStreamResponse();
}
