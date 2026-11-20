export type TeammateStatus = "scaffolded" | "local" | "stopped";

export type TeammateModel = {
  id: string;
  params?: { id: string; value: string }[];
};

export type TeammateRecord = {
  id: string;
  slug: string;
  name: string;
  /** Preset id when created from a preset; null for blank. */
  presetId: string | null;
  role: string;
  brief: string;
  model: TeammateModel;
  tools: string[];
  status: TeammateStatus;
  port: number;
  agentPath: string;
  createdAt: string;
};

export type CreateTeammateInput = {
  name: string;
  slug: string;
  presetId: string | null;
  role: string;
  brief: string;
  modelId: string;
  modelParams?: { id: string; value: string }[];
  tools: string[];
};
