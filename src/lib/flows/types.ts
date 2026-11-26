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
  /** Model ref "<provider>:<model>" (e.g. anthropic:claude-opus-5-5); default CONSOL_MODEL. */
  model?: string;
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
  /** Coding agent for the coding-agent script: "cursor", "claude-code", or "auto" (default). */
  agent?: string;
};

export type FlowStage = AgentStage | HumanStage | ScriptStage;

export type TransitionEdge = {
  next: string;
  /** Outcome label: approve | reject | success | failure | done | default */
  when?: string;
};

export type FlowInputField = {
  key: string;
  label: string;
  description?: string;
  type: "string" | "text" | "url" | "select";
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
};

export type FlowDefinition = {
  key: string;
  name: string;
  description: string;
  domain: string;
  entry: string;
  stages: FlowStage[];
  transitions: Record<string, string | TransitionEdge[]>;
  inputs: FlowInputField[];
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

export function formatFlowInputsBlock(
  inputs: Record<string, string>,
  fields: FlowInputField[],
): string {
  const lines: string[] = [];
  for (const field of fields) {
    const value = (inputs[field.key] ?? "").trim();
    if (!value) continue;
    lines.push(`- **${field.label}**: ${value}`);
  }
  for (const [key, raw] of Object.entries(inputs)) {
    if (fields.some((field) => field.key === key)) continue;
    const value = raw.trim();
    if (!value) continue;
    lines.push(`- **${key}**: ${value}`);
  }
  if (!lines.length) return "";
  return ["### Inputs", ...lines].join("\n");
}

export function validateFlowInputs(
  fields: FlowInputField[],
  values: Record<string, string>,
): { ok: true; inputs: Record<string, string> } | { ok: false; error: string } {
  const inputs: Record<string, string> = {};
  for (const field of fields) {
    const value = (values[field.key] ?? "").trim();
    if (field.required !== false && !value) {
      return { ok: false, error: `${field.label} is required` };
    }
    if (field.type === "select" && value && field.options?.length) {
      const allowed = field.options.some((option) => option.value === value);
      if (!allowed) {
        return { ok: false, error: `${field.label} has an invalid value` };
      }
    }
    if (value) inputs[field.key] = value;
  }
  return { ok: true, inputs };
}
