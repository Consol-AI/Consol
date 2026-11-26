/** Client-safe types for chat work proposals (no DB imports). */
import type { FlowDefinition, FlowInputField } from "@/lib/flows/types";

/**
 * proposed → (edited)* → starting → confirmed, or proposed → dismissed.
 * A newer proposal in the same thread supersedes an open one.
 */
export type ProposalState =
  | "proposed"
  | "starting"
  | "confirmed"
  | "dismissed"
  | "superseded";

export type WorkProposalView = {
  id: string;
  message_id: string | null;
  flow_key: string;
  inputs: Record<string, string>;
  state: ProposalState;
  /** Last start failure, shown on the block so the user can retry. */
  error: string | null;
  work_item: {
    id: string;
    href: string;
    title: string;
    status: string;
    stage_name: string;
    stage_type: string;
  } | null;
  created_at: string;
};

/** The parts of a flow the proposal block needs to render its form. */
export type ProposalFlowOption = {
  key: string;
  name: string;
  description: string;
  inputs: FlowInputField[];
};

export const REPO_INPUT_KEY = "repo";

/**
 * Proposals never fall back to an implicit repo: if a flow takes a repo,
 * the user must see and confirm it, so it is required here.
 */
export function proposalFieldRequired(field: FlowInputField): boolean {
  return field.key === REPO_INPUT_KEY || field.required !== false;
}

export function proposalFields(flow: { inputs: FlowInputField[] }): FlowInputField[] {
  return flow.inputs.map((field) => ({
    ...field,
    required: proposalFieldRequired(field),
  }));
}

export function toProposalFlowOption(flow: FlowDefinition): ProposalFlowOption {
  return {
    key: flow.key,
    name: flow.name,
    description: flow.description,
    inputs: flow.inputs,
  };
}

/** Client-side check that mirrors the server's required-field validation. */
export function proposalInputsComplete(
  flow: { inputs: FlowInputField[] },
  inputs: Record<string, string>,
): boolean {
  return proposalFields(flow).every(
    (field) => !field.required || Boolean((inputs[field.key] ?? "").trim()),
  );
}
