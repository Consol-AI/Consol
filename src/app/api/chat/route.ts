import { getIdentity } from "../../../../cursor/identity";
import { formatWorkspaceBriefForPrompt, mockAssistantReply } from "@/lib/ai";
import { parseDeliveryIntent, startSoftwareDelivery } from "@/lib/delivery/start";
import { resolveRepo } from "@/lib/integrations/local";
import { getTextModel } from "@/lib/models";
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
  /** When true, skip delivery auto-start even if intent matches. */
  skipDelivery?: boolean;
  /** Confirm starting a parsed delivery from chat. */
  confirmDelivery?: boolean;
  deliveryTitle?: string;
  deliveryBody?: string;
  deliveryRepo?: string;
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
          repo: body.deliveryRepo?.trim() || undefined,
        }
      : parseDeliveryIntent(message);

    if (intent.wantsDelivery && body.confirmDelivery) {
      try {
        const started = await startSoftwareDelivery({
          organizationId,
          actorSub: viewer.sub,
          title: intent.title,
          body: intent.body,
          repo: intent.repo,
          runSpec: true,
        });
        const reply = [
          `Started **software delivery** on \`${started.repo.owner}/${started.repo.repo}\`.`,
          "",
          `**${started.item.title}**`,
          started.specSummary
            ? `Drafting the spec now — ${started.specSummary}`
            : "Work item created at Spec.",
          "",
          `Open it: ${started.href}`,
          "",
          "Next: approve the spec, then Consol launches a coding agent to build and open a PR.",
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
      const repo = await resolveRepo(intent.repo ? { repo: intent.repo } : null);
      const reply = repo
        ? [
            `I can start a **software delivery** on \`${repo.owner}/${repo.repo}\` (base \`${repo.baseBranch}\`) for:`,
            "",
            `**${intent.title}**`,
            "",
            "Flow: Spec → Approve spec → Build (coding agent) → Validate → Approve ship → Merge.",
            "Confirm and I'll create the work item, draft the spec, and park it on Approve spec.",
          ].join("\n")
        : "I couldn't find a GitHub repo to deliver to. Set `CONSOL_GITHUB_REPO=owner/repo` in .env.local, or name one: \"ship on owner/repo: …\".";
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
          repo: repo ? `${repo.owner}/${repo.repo}` : null,
        },
      });
    }
  }

  const model = getTextModel();
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
        "Users can start a software delivery from chat, e.g. \"ship: add a footer link\" (spec → approve → coding agent build → validate → approve → merge).",
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
