import { formatFlowInputsBlock } from "@/lib/flows/types";
import type { FlowDefinition } from "@/lib/flows/types";
import { queueStageIfAutomated } from "@/lib/flows/runtime";
import {
  createWorkItem,
  ensureOrgProcess,
  listStages,
  type Process,
  type Stage,
  type WorkItem,
} from "@/lib/factory";

/** Title for a new item: the title input, else the flow's main text input. */
export function flowItemTitle(
  flow: FlowDefinition,
  inputs: Record<string, string>,
): string {
  return (
    inputs.title?.trim() ||
    inputs.goal?.trim() ||
    inputs.opportunity?.trim() ||
    flow.name
  );
}

/**
 * Create a work item at the flow's entry stage and queue that stage when
 * it is automated. Inputs must already be validated against `flow.inputs`.
 * Shared by the Start-flow wizard and confirmed chat proposals.
 */
export async function startFlowWorkItem(input: {
  organizationId: string;
  actorSub: string;
  flow: FlowDefinition;
  inputs: Record<string, string>;
  origin?: Record<string, string> | null;
}): Promise<{ process: Process; item: WorkItem; entry: Stage }> {
  const { flow } = input;
  const process = await ensureOrgProcess({
    organizationId: input.organizationId,
    templateKey: flow.key,
    createdBy: input.actorSub,
  });
  const stages = await listStages(process.id);
  const entry = stages.find((s) => s.stage_key === flow.entry) ?? stages[0];
  if (!entry) throw new Error("Flow has no entry stage");

  const item = await createWorkItem({
    processId: process.id,
    stageId: entry.id,
    title: flowItemTitle(flow, input.inputs),
    body: formatFlowInputsBlock(input.inputs, flow.inputs),
    inputs: input.inputs,
    createdBy: input.actorSub,
    origin: input.origin ?? null,
  });
  await queueStageIfAutomated({
    itemId: item.id,
    stage: entry,
    actorSub: input.actorSub,
  });
  return { process, item, entry };
}
