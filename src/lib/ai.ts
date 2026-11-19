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
}): string {
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
