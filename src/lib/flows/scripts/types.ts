export type ScriptRunInput = {
  title: string;
  body: string;
  stageKey: string;
  inline?: string;
};

export type ScriptRunResult = {
  ok: boolean;
  outcome: "success" | "failure";
  summary: string;
};
