import { streamText } from "ai";
import { getIdentity } from "../../../../cursor/identity";
import { getLanguageModel, mockAssistantReply } from "@/lib/ai";
import {
  addMessage,
  assertProductAccess,
  getProcess,
  getWorkItem,
  listStages,
} from "@/lib/factory";

export const runtime = "nodejs";

type ChatBody = {
  message?: string;
  processId?: string;
  workItemId?: string;
};

export async function POST(request: Request) {
  const identity = await getIdentity(request);
  if (!identity.verified || identity.kind !== "person") {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as ChatBody;
  const message = body.message?.trim() ?? "";
  if (!message) {
    return Response.json({ error: "message required" }, { status: 400 });
  }

  let processId = body.processId ?? null;
  let workItemId = body.workItemId ?? null;
  let contextLabel = "this workspace";
  let stageNames: string[] = [];

  if (workItemId) {
    const item = await getWorkItem(workItemId);
    if (!item) return Response.json({ error: "item not found" }, { status: 404 });
    const process = await getProcess(item.process_id);
    if (!process) {
      return Response.json({ error: "process not found" }, { status: 404 });
    }
    const product = await assertProductAccess(process.product_id, identity.sub);
    if (!product) return Response.json({ error: "forbidden" }, { status: 403 });
    processId = process.id;
    contextLabel = `${item.title} (${process.name})`;
    stageNames = (await listStages(process.id)).map((s) => s.name);
  } else if (processId) {
    const process = await getProcess(processId);
    if (!process) {
      return Response.json({ error: "process not found" }, { status: 404 });
    }
    const product = await assertProductAccess(process.product_id, identity.sub);
    if (!product) return Response.json({ error: "forbidden" }, { status: 403 });
    contextLabel = process.name;
    stageNames = (await listStages(process.id)).map((s) => s.name);
  } else {
    return Response.json({ error: "context required" }, { status: 400 });
  }

  await addMessage({
    processId,
    workItemId,
    role: "user",
    content: message,
    authorSub: identity.sub,
    authorName: identity.name || identity.email || "Teammate",
  });

  const model = getLanguageModel();
  if (!model) {
    const reply = mockAssistantReply({
      userMessage: message,
      contextLabel,
      stageNames,
    });
    await addMessage({
      processId,
      workItemId,
      role: "assistant",
      content: reply,
      authorName: "Forge AI",
    });
    return Response.json({ reply, mock: true });
  }

  const result = streamText({
    model,
    system: [
      "You are Forge, an AI collaborator inside a product factory workspace.",
      "Help cross-functional teams move work through professional lifecycles.",
      `Current context: ${contextLabel}.`,
      stageNames.length ? `Lifecycle stages: ${stageNames.join(" → ")}.` : "",
      "Be concrete, concise, and actionable. Prefer short structured answers.",
    ]
      .filter(Boolean)
      .join(" "),
    prompt: message,
    onFinish: async ({ text }) => {
      await addMessage({
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
