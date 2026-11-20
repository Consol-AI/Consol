import { createOpenAI } from "@ai-sdk/openai";

export function hasAiKey(): boolean {
  return Boolean(
    process.env.AI_GATEWAY_API_KEY?.trim() ||
      process.env.OPENAI_API_KEY?.trim(),
  );
}

export function getLanguageModel() {
  const gatewayKey = process.env.AI_GATEWAY_API_KEY?.trim();
  if (gatewayKey) {
    const openai = createOpenAI({
      apiKey: gatewayKey,
      baseURL: "https://ai-gateway.vercel.sh/v1",
    });
    return openai("gpt-4o-mini");
  }
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    const openai = createOpenAI({ apiKey: openaiKey });
    return openai("gpt-4o-mini");
  }
  return null;
}

export function mockAssistantReply(input: {
  userMessage: string;
  contextLabel: string;
  stageNames?: string[];
  workspaceBrief?: string;
}): string {
  if (input.workspaceBrief) {
    return [
      `Here's how I'd coordinate **${input.contextLabel}** right now.`,
      "",
      `You said: “${input.userMessage.trim()}”`,
      "",
      input.workspaceBrief,
      "",
      "Suggested next moves:",
      "1. Clear anything in **Needs you** first — approve, decide, or unblock.",
      "2. For agent-owned stages, check the draft and send a redirect if scope drifted.",
      "3. If nothing is open, start a project brief or create a work item on the right floor.",
      "",
      "_Sample AI reply — connect AI_GATEWAY_API_KEY or OPENAI_API_KEY for live model responses._",
    ].join("\n");
  }

  const stages = input.stageNames?.length
    ? input.stageNames.join(" → ")
    : "Discover → Define → Deliver";
  return [
    `Here's a practical next move for **${input.contextLabel}**.`,
    "",
    `You said: “${input.userMessage.trim()}”`,
    "",
    "Suggested path:",
    `1. Clarify the outcome for the current stage in this lifecycle (${stages}).`,
    "2. Capture one owner, one due signal, and the evidence needed to move forward.",
    "3. Draft a short brief teammates can comment on, then ask AI to refine acceptance criteria or analysis questions.",
    "",
    "_Sample AI reply — connect AI_GATEWAY_API_KEY or OPENAI_API_KEY for live model responses._",
  ].join("\n");
}

export function formatWorkspaceBriefForPrompt(brief: {
  productCount: number;
  products: { name: string; description: string }[];
  attention: {
    title: string;
    stage_name: string;
    stage_type: string;
    process_name: string;
    product_name: string;
  }[];
  needsYou: number;
  agentsWorking: number;
}): string {
  const productLines =
    brief.products.length === 0
      ? "- No projects yet."
      : brief.products
          .slice(0, 8)
          .map(
            (p) =>
              `- ${p.name}${p.description ? `: ${p.description.slice(0, 80)}` : ""}`,
          )
          .join("\n");

  const attentionLines =
    brief.attention.length === 0
      ? "- No open work items."
      : brief.attention
          .slice(0, 12)
          .map((item) => {
            const bucket =
              item.stage_type === "human" || item.stage_type === "legacy"
                ? "needs you"
                : item.stage_type === "agent"
                  ? "agents working"
                  : "waiting";
            return `- [${bucket}] ${item.title} · ${item.product_name} / ${item.process_name} · ${item.stage_name}`;
          })
          .join("\n");

  return [
    `Projects (${brief.productCount}):`,
    productLines,
    "",
    `Open work — ${brief.needsYou} need you, ${brief.agentsWorking} with agents:`,
    attentionLines,
  ].join("\n");
}
