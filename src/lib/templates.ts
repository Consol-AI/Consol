import { FLOW_DEFINITIONS, getFlow } from "@/lib/flows";
import type { FlowDefinition } from "@/lib/flows/types";

/** @deprecated Prefer FlowDefinition from @/lib/flows — kept for callers expecting ProcessTemplate. */
export type ProcessTemplate = {
  key: string;
  name: string;
  domain: string;
  description: string;
  stages: { name: string; description: string }[];
};

function toProcessTemplate(flow: FlowDefinition): ProcessTemplate {
  return {
    key: flow.key,
    name: flow.name,
    domain: flow.domain,
    description: flow.description,
    stages: flow.stages.map((stage) => ({
      name: stage.name,
      description: stage.description ?? "",
    })),
  };
}

export const PROCESS_TEMPLATES: ProcessTemplate[] =
  FLOW_DEFINITIONS.map(toProcessTemplate);

export function getTemplate(key: string): ProcessTemplate | undefined {
  const flow = getFlow(key);
  return flow ? toProcessTemplate(flow) : undefined;
}
