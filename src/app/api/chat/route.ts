import { formatWorkspaceBriefForPrompt, mockAssistantReply } from "@/lib/ai";
import { getRequestViewer } from "@/lib/auth";
import { getFlow, listFlows } from "@/lib/flows";
import { getTextModel } from "@/lib/models";
import {
  addMessage,
  assertOrgAccess,
  assertProcessAccess,
  buildWorkspaceBrief,
  getProcess,
  getWorkItem,
  listMessages,
  listStages,
  type Message,
} from "@/lib/factory";
import { createProposal, knownRepos } from "@/lib/proposals";
import { inferWorkProposal } from "@/lib/proposals/infer";
import { REPO_INPUT_KEY } from "@/lib/proposals/types";

export const runtime = "nodejs";

type ChatBody = {
  message?: string;
  processId?: string;
  workItemId?: string;
  organizationId?: string;
  /** Optional model ref override ("openai:gpt-4o-mini", etc.). */
  model?: string;
  /** When true, never reply with a work proposal. */
  skipProposal?: boolean;
};

export async function POST(request: Request) {
  const viewer = await getRequestViewer(request);
  if (!viewer) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as ChatBody;
  const message = body.message?.trim() ?? "";
  if (!message) {
    return Response.json({ error: "message required" }, { status: 400 });
  }

  let processId = body.processId ?? null;
  const workItemId = body.workItemId ?? null;
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

  // Home-thread history (before this message) gives proposals context.
  const history: Message[] =
    organizationId && !processId && !workItemId
      ? (await listMessages({ organizationId })).slice(-8)
      : [];

  const userMessage = await addMessage({
    organizationId,
    processId,
    workItemId,
    role: "user",
    content: message,
    authorSub: viewer.sub,
    authorName: viewer.name,
  });

  const model = getTextModel(body.model?.trim() || null);

  // Home chat: when the message asks to start work, reply with a Work
  // Proposal block instead of acting. Nothing starts until the user confirms.
  if (organizationId && !processId && !workItemId && !body.skipProposal) {
    const flows = listFlows();
    const inferred = await inferWorkProposal({
      message,
      history: history.map((m) => ({ role: m.role, content: m.content })),
      flows,
      knownRepos: await knownRepos(),
      model,
    });
    const flow = inferred ? getFlow(inferred.flowKey) : undefined;
    if (inferred && flow) {
      const missingRepo = flow.inputs.some(
        (field) =>
          field.key === REPO_INPUT_KEY && !inferred.inputs[REPO_INPUT_KEY],
      );
      const reply = [
        `I can start this as a **${flow.name}** flow. Check the details below and press **Start** when they look right — nothing runs until you do.`,
        missingRepo ? "Pick the repository it should run against." : "",
      ]
        .filter(Boolean)
        .join(" ");
      const assistantMessage = await addMessage({
        organizationId,
        role: "assistant",
        content: reply,
        authorName: "Forge AI",
      });
      const proposal = await createProposal({
        organizationId,
        messageId: assistantMessage.id,
        sourceMessageId: userMessage.id,
        flowKey: flow.key,
        inputs: inferred.inputs,
        createdBy: viewer.sub,
      });
      return Response.json({ reply, message: assistantMessage, proposal });
    }
  }

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
        "Help the user coordinate tasks and decisions across flows, work items, and teammates.",
        "Be concrete and concise. Surface what needs a human decision first, then agent work, then waiting items.",
        "When useful, point to a work item by name and suggest the next decision or handoff.",
        "Users can start work from chat by asking for it, e.g. \"implement a footer changelog link in owner/repo\". Forge then shows a work proposal they confirm; you never start work yourself.",
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

  const textModel = model;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let text = "";
      try {
        for await (const chunk of textModel.stream({
          system,
          messages: [{ role: "user", content: message }],
          effort: "low",
        })) {
          text += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (error) {
        const detail =
          error instanceof Error ? error.message : "Model request failed";
        const note = `\n\n_Model error (${textModel.ref}): ${detail}_`;
        text += note;
        controller.enqueue(encoder.encode(note));
      } finally {
        controller.close();
        if (text.trim()) {
          await addMessage({
            organizationId,
            processId,
            workItemId,
            role: "assistant",
            content: text,
            authorName: "Forge AI",
          });
        }
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
