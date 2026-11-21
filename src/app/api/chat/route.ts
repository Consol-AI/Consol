import { streamText } from "ai";
import { getIdentity } from "../../../../cursor/identity";
import {
  formatWorkspaceBriefForPrompt,
  getLanguageModel,
  mockAssistantReply,
} from "@/lib/ai";
import { parseDeliveryIntent, startSoftwareDelivery } from "@/lib/delivery/start";
import {
  addMessage,
  assertOrgAccess,
  assertProductAccess,
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
  /** When true, skip delivery auto-start even if intent matches. */
  skipDelivery?: boolean;
  /** Confirm starting a parsed delivery from chat. */
  confirmDelivery?: boolean;
  deliveryTitle?: string;
  deliveryBody?: string;
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
    const process = await getProcess(item.process_id);
    if (!process) {
      return Response.json({ error: "process not found" }, { status: 404 });
    }
    const product = await assertProductAccess(process.product_id, viewer.sub);
    if (!product) return Response.json({ error: "forbidden" }, { status: 403 });
    processId = process.id;
    organizationId = product.organization_id;
    contextLabel = `${item.title} (${process.name})`;
    stageNames = (await listStages(process.id)).map((s) => s.name);
  } else if (processId) {
    const process = await getProcess(processId);
    if (!process) {
      return Response.json({ error: "process not found" }, { status: 404 });
    }
    const product = await assertProductAccess(process.product_id, viewer.sub);
    if (!product) return Response.json({ error: "forbidden" }, { status: 403 });
    organizationId = product.organization_id;
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

  // Home-chat delivery initiation (confirm or propose).
  if (organizationId && !processId && !workItemId && !body.skipDelivery) {
    const intent = body.confirmDelivery
      ? {
          wantsDelivery: true,
          title: (body.deliveryTitle || message).trim(),
          body: (body.deliveryBody || message).trim(),
        }
      : parseDeliveryIntent(message);

    if (intent.wantsDelivery && body.confirmDelivery) {
      try {
        const started = await startSoftwareDelivery({
          organizationId,
          actorSub: viewer.sub,
          title: intent.title,
          body: intent.body,
          runSpec: true,
        });
        const reply = [
          `Started **software delivery** for **${started.product.name}**.`,
          "",
          `**${started.item.title}**`,
          started.specSummary
            ? `Spec draft ready — ${started.specSummary}`
            : "Work item created at Spec.",
          "",
          `Open it: ${started.href}`,
          "",
          "Next: approve the spec, then Consol will launch a Cursor Cloud Agent to build and open a PR.",
        ].join("\n");
        await addMessage({
          organizationId,
          processId: started.process.id,
          workItemId: started.item.id,
          role: "assistant",
          content: reply,
          authorName: "Forge AI",
        });
        return Response.json({
          reply,
          delivery: {
            started: true,
            href: started.href,
            itemId: started.item.id,
            productId: started.product.id,
            processId: started.process.id,
            title: started.item.title,
          },
        });
      } catch (error) {
        const detail =
          error instanceof Error ? error.message : "Could not start delivery";
        const reply = `I couldn't start software delivery: ${detail}`;
        await addMessage({
          organizationId,
          role: "assistant",
          content: reply,
          authorName: "Forge AI",
        });
        return Response.json({ reply, error: detail }, { status: 400 });
      }
    }

    if (intent.wantsDelivery && !body.confirmDelivery) {
      const reply = [
        `I can start a **software delivery** on **LeagueSports** (repo \`leaguesports/landing-page\`) for:`,
        "",
        `**${intent.title}**`,
        "",
        "Flow: Spec → Approve spec → Cursor build → Validate → Approve ship → Merge.",
        "Confirm and I'll create the work item, draft the spec, and park it on Approve spec.",
      ].join("\n");
      await addMessage({
        organizationId,
        role: "assistant",
        content: reply,
        authorName: "Forge AI",
      });
      return Response.json({
        reply,
        delivery: {
          started: false,
          needsConfirm: true,
          title: intent.title,
          body: intent.body,
        },
      });
    }
  }

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
        "Users can start a LeagueSports software delivery from chat (spec → approve → Cursor build → validate → approve → merge).",
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
