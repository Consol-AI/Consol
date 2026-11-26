import { MOCK_MODEL_HINT } from "@/lib/models";

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
      "3. If nothing is open, start a flow from Work or ask me to ship a change.",
      "",
      MOCK_MODEL_HINT,
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
    MOCK_MODEL_HINT,
  ].join("\n");
}

export function formatWorkspaceBriefForPrompt(brief: {
  attention: {
    title: string;
    stage_name: string;
    stage_type: string;
    process_name: string;
  }[];
  needsYou: number;
  agentsWorking: number;
}): string {
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
            return `- [${bucket}] ${item.title} · ${item.process_name} · ${item.stage_name}`;
          })
          .join("\n");

  return [
    `Open work — ${brief.needsYou} need you, ${brief.agentsWorking} with agents:`,
    attentionLines,
  ].join("\n");
}
