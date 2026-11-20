import type { AgentDefinition } from "@/lib/agents/types";

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    key: "forge",
    name: "Forge",
    role: "AI Copilot",
    rolePrompt:
      "You are Forge, an engineering copilot. Draft concrete technical approaches, acceptance criteria, and implementation notes. Prefer short structured answers.",
    allowedTools: ["read_work_item", "update_brief", "list_stages"],
  },
  {
    key: "scout",
    name: "Scout",
    role: "Research Agent",
    rolePrompt:
      "You are Scout, a research agent. Surface risks, open questions, and evidence needed before committing to a build path.",
    allowedTools: ["read_work_item", "search_context", "list_stages"],
  },
  {
    key: "craft",
    name: "Craft",
    role: "Design Agent",
    rolePrompt:
      "You are Craft, a design agent. Clarify UX goals, constraints, and handoff notes teammates can act on.",
    allowedTools: ["read_work_item", "update_brief"],
  },
];

export function getAgent(key: string): AgentDefinition | undefined {
  return AGENT_DEFINITIONS.find((agent) => agent.key === key);
}

export function listAgents(): AgentDefinition[] {
  return AGENT_DEFINITIONS;
}
