export type ScriptRunInput = {
  title: string;
  body: string;
  stageKey: string;
  inline?: string;
  /** The stage's config (e.g. `agent` for the coding-agent script). */
  config?: Record<string, unknown>;
  /** Structured start-form context from the work item. */
  inputs?: Record<string, string>;
  /** Optional execution context for integration scripts. */
  organizationId?: string;
  processId?: string;
  workItemId?: string;
  actorSub?: string;
};

export type ScriptRunResult = {
  ok: boolean;
  /** success/failure transition; pending keeps the work item on the current stage. */
  outcome: "success" | "failure" | "pending";
  summary: string;
};
