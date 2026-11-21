export type ScriptRunInput = {
  title: string;
  body: string;
  stageKey: string;
  inline?: string;
  /** Optional execution context for integration scripts. */
  productId?: string;
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
