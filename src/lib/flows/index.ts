import { dataAnalysisFlow, designFlow } from "@/lib/flows/legacy-linear";
import { productManagementFlow } from "@/lib/flows/product-management";
import { softwareDeliveryFlow } from "@/lib/flows/software-delivery";
import type { FlowDefinition } from "@/lib/flows/types";

export const FLOW_DEFINITIONS: FlowDefinition[] = [
  productManagementFlow,
  softwareDeliveryFlow,
  designFlow,
  dataAnalysisFlow,
];

export function getFlow(key: string): FlowDefinition | undefined {
  return FLOW_DEFINITIONS.find((flow) => flow.key === key);
}

export function listFlows(): FlowDefinition[] {
  return FLOW_DEFINITIONS;
}

export type {
  AgentStage,
  FlowDefinition,
  FlowInputField,
  FlowStage,
  HumanStage,
  NormalizedTransition,
  ScriptStage,
  StageType,
  TransitionEdge,
} from "@/lib/flows/types";
export {
  formatFlowInputsBlock,
  normalizeTransitions,
  validateFlowInputs,
} from "@/lib/flows/types";
