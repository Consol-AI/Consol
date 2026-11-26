import { generateText } from "ai";
import { getAgent } from "@/lib/agents/registry";
import type {
  AgentInvokeInput,
  AgentInvokeResult,
  AgentToolName,
} from "@/lib/agents/types";
import { getLanguageModel, hasAiKey } from "@/lib/ai";
import { getTeammateBySlug } from "@/lib/teammates/registry";
import { runTeammateTurn } from "@/lib/teammates/runtime";

function formatInputsForPrompt(inputs?: Record<string, string>): string {
  if (!inputs) return "";
  const lines = Object.entries(inputs)
    .filter(([, value]) => value.trim())
    .map(([key, value]) => `- ${key}: ${value.trim()}`);
  return lines.length ? `Inputs:\n${lines.join("\n")}` : "";
}

function mockAgentReply(input: AgentInvokeInput, tools: AgentToolName[]): string {
  const toolsLine = tools.length
    ? `Tools considered: ${tools.join(", ")}.`
    : "No tools configured.";
  const inputsLine = formatInputsForPrompt(input.workItemInputs);
  return [
    `## ${input.stageName} — agent draft`,
    "",
    `Work item: **${input.workItemTitle}**`,
    inputsLine ||
      (input.workItemBody.trim()
        ? `Context: ${input.workItemBody.trim().slice(0, 280)}`
        : "Context: (empty brief)"),
    "",
    "Proposed next steps:",
    "1. Restate the outcome for this stage in one sentence.",
    "2. List acceptance criteria teammates can check.",
    "3. Call out risks or evidence still needed.",
    "",
    toolsLine,
    "",
    "_Sample agent run — connect AI_GATEWAY_API_KEY or OPENAI_API_KEY for live model responses._",
  ].join("\n");
}

export async function invokeAgent(
  input: AgentInvokeInput,
): Promise<AgentInvokeResult> {
  const teammate = await getTeammateBySlug(input.agentKey);
  if (teammate) {
    const rolePrompt = input.rolePrompt?.trim();
    const message = [
      rolePrompt ? `Stage role prompt:\n${rolePrompt}` : "",
      `Stage: ${input.stageName}`,
      `Title: ${input.workItemTitle}`,
      formatInputsForPrompt(input.workItemInputs),
      `Brief:\n${input.workItemBody || "(none)"}`,
      input.userHint ? `Hint: ${input.userHint}` : "",
      input.allowedTools?.length
        ? `Allowed tools: ${input.allowedTools.join(", ")}`
        : teammate.tools.length
          ? `Allowed tools: ${teammate.tools.join(", ")}`
          : "",
      "Produce a concrete stage deliverable teammates can review.",
    ]
      .filter(Boolean)
      .join("\n\n");

    const turn = await runTeammateTurn({
      teammate,
      message,
      signal: input.signal,
    });
    input.signal?.throwIfAborted();
    const toolsUsed = (
      input.allowedTools?.length ? input.allowedTools : teammate.tools
    ).slice(0, 3) as AgentToolName[];

    return {
      agentKey: teammate.slug,
      agentName: teammate.name,
      content: turn.reply,
      toolsUsed,
      mock: turn.source === "mock",
    };
  }

  const agent = getAgent(input.agentKey);
  if (!agent) {
    throw new Error(`Unknown agent: ${input.agentKey}`);
  }

  const rolePrompt = input.rolePrompt?.trim() || agent.rolePrompt;
  const allowedTools = input.allowedTools?.length
    ? input.allowedTools
    : agent.allowedTools;
  const toolsUsed = allowedTools.slice(0, 3);

  const userPrompt = [
    `Stage: ${input.stageName}`,
    `Title: ${input.workItemTitle}`,
    formatInputsForPrompt(input.workItemInputs),
    `Brief:\n${input.workItemBody || "(none)"}`,
    input.userHint ? `Hint: ${input.userHint}` : "",
    `Allowed tools: ${allowedTools.join(", ") || "none"}`,
    "Produce a concrete stage deliverable teammates can review.",
  ]
    .filter(Boolean)
    .join("\n\n");

  if (!hasAiKey()) {
    return {
      agentKey: agent.key,
      agentName: agent.name,
      content: mockAgentReply(input, toolsUsed),
      toolsUsed,
      mock: true,
    };
  }

  const model = getLanguageModel();
  if (!model) {
    return {
      agentKey: agent.key,
      agentName: agent.name,
      content: mockAgentReply(input, toolsUsed),
      toolsUsed,
      mock: true,
    };
  }

  const result = await generateText({
    model,
    system: rolePrompt,
    prompt: userPrompt,
    abortSignal: input.signal,
  });

  return {
    agentKey: agent.key,
    agentName: agent.name,
    content: result.text.trim(),
    toolsUsed,
    mock: false,
  };
}
