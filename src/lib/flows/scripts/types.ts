export type ScriptRunInput = {
  title: string;
  body: string;
  stageKey: string;
  inline?: string;
  /** Structured start-form context from the work item. */
  inputs?: Record<string, string>;
  /** Optional execution context for integration scripts. */
  productId?: string;
  processId?: string;
  workItemId?: string;
  actorSub?: string;
};

export type ScriptRunResult = {
  ok: boolean;
  outcome: "success" | "failure";
  summary: string;
};
