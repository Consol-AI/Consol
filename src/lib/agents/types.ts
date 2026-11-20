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
  stageName: string;
  userHint?: string;
};

export type AgentInvokeResult = {
  agentKey: string;
  agentName: string;
  content: string;
  toolsUsed: AgentToolName[];
  mock: boolean;
};
