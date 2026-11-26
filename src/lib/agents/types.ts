export type AgentToolName =
  | "read_work_item"
  | "update_brief"
  | "list_stages"
  | "search_context";

export type AgentDefinition = {
  key: string;
  name: string;
  role: string;
  rolePrompt: string;
  allowedTools: AgentToolName[];
};

export type AgentInvokeInput = {
  agentKey: string;
  /** Optional stage override for the system prompt. */
  rolePrompt?: string;
  allowedTools?: AgentToolName[];
  workItemTitle: string;
  workItemBody: string;
  /** Structured start-form context from the work item. */
  workItemInputs?: Record<string, string>;
  stageName: string;
  userHint?: string;
  /** Aborts the model call / agent turn (flow stopped). */
  signal?: AbortSignal;
};

export type AgentInvokeResult = {
  agentKey: string;
  agentName: string;
  content: string;
  toolsUsed: AgentToolName[];
  mock: boolean;
};
