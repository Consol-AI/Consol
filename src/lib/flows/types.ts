import type { AgentToolName } from "@/lib/agents/types";

export type StageType = "agent" | "human" | "script";

export type AgentStage = {
  id: string;
  type: "agent";
  name: string;
  description?: string;
  rolePrompt: string;
  allowedTools: AgentToolName[];
  agentKey?: string;
};

export type HumanStage = {
  id: string;
  type: "human";
  name: string;
  description?: string;
  responsible: string;
  approves: string;
};

export type ScriptStage = {
  id: string;
  type: "script";
  name: string;
  description?: string;
  /** Registered script module key under src/lib/flows/scripts. */
  path?: string;
  /** Optional inline script source (simple predicate language). */
  inline?: string;
};

export type FlowStage = AgentStage | HumanStage | ScriptStage;

export type TransitionEdge = {
  next: string;
  /** Outcome label: approve | reject | success | failure | done | default */
  when?: string;
};

export type FlowDefinition = {
  key: string;
  name: string;
  description: string;
  domain: string;
  entry: string;
  stages: FlowStage[];
  transitions: Record<string, string | TransitionEdge[]>;
};

export type NormalizedTransition = {
  next: string;
  when: string;
};

export function normalizeTransitions(
  transitions: FlowDefinition["transitions"],
  stageId: string,
): NormalizedTransition[] {
  const raw = transitions[stageId];
  if (!raw) return [];
  if (typeof raw === "string") {
    return [{ next: raw, when: "default" }];
  }
  return raw.map((edge) => ({
    next: edge.next,
    when: edge.when?.trim() || "default",
  }));
}
