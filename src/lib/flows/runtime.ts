import { invokeAgent } from "@/lib/agents";
import type { AgentToolName } from "@/lib/agents/types";
import { runFlowScript } from "@/lib/flows/scripts";
import {
  addMessage,
  addStageRunEvent,
  getProcess,
  getWorkItem,
  listStageTransitions,
  listStages,
  moveWorkItem,
  setWorkItemStatus,
  stageConfig,
  type Stage,
  type StageTransition,
  type WorkItem,
  updateWorkItem,
} from "@/lib/factory";

export type AdvanceOutcome =
  | "default"
  | "approve"
  | "reject"
  | "success"
  | "failure"
  | "done";

export type AdvanceResult = {
  item: WorkItem;
  fromStageKey: string;
  toStageKey: string | null;
  outcome: string;
  summary: string;
  completed: boolean;
};

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asToolList(value: unknown): AgentToolName[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is AgentToolName => typeof v === "string");
}

export function resolveTransition(
  transitions: StageTransition[],
  fromStageKey: string,
  outcome: string,
): StageTransition | null {
  const edges = transitions.filter((t) => t.from_stage_key === fromStageKey);
  if (edges.length === 0) return null;
  const exact = edges.find((t) => t.when_label === outcome);
  if (exact) return exact;
  if (outcome === "done") {
    return edges.find((t) => t.when_label === "default") ?? null;
  }
  return edges.find((t) => t.when_label === "default") ?? null;
}

export function legalOutcomesForStage(
  stage: Stage,
  transitions: StageTransition[],
): string[] {
  const edges = transitions.filter(
    (t) => t.from_stage_key === (stage.stage_key || stage.id),
  );
  if (stage.stage_type === "human") {
    return ["approve", "reject"].filter((label) =>
      edges.some((e) => e.when_label === label),
    );
  }
  if (stage.stage_type === "script") {
    return ["success", "failure"].filter((label) =>
      edges.some((e) => e.when_label === label),
    );
  }
  if (stage.stage_type === "agent") {
    const labels = edges.map((e) => e.when_label);
    if (labels.includes("default") || labels.length === 0) return ["done"];
    return Array.from(new Set(labels));
  }
  // Legacy free-move boards: any target allowed via moveWorkItem
  return [];
}

export function targetStageKeyForOutcome(
  stage: Stage,
  transitions: StageTransition[],
  outcome: string,
): string | null {
  const key = stage.stage_key || stage.id;
  const edge = resolveTransition(transitions, key, outcome);
  return edge?.to_stage_key ?? null;
}

async function appendSystemNote(input: {
  processId: string;
  workItemId: string;
  content: string;
  authorName: string;
}) {
  await addMessage({
    processId: input.processId,
    workItemId: input.workItemId,
    role: "system",
    content: input.content,
    authorName: input.authorName,
  });
}

export async function runAgentStage(input: {
  item: WorkItem;
  stage: Stage;
  actorSub: string;
}): Promise<{ summary: string; content: string }> {
  const config = stageConfig(input.stage);
  const agentKey = asString(config.agentKey, "forge");
  const rolePrompt = asString(config.rolePrompt);
  const allowedTools = asToolList(config.allowedTools);

  const result = await invokeAgent({
    agentKey,
    rolePrompt: rolePrompt || undefined,
    allowedTools: allowedTools.length ? allowedTools : undefined,
    workItemTitle: input.item.title,
    workItemBody: input.item.body,
    stageName: input.stage.name,
  });

  const nextBody = [
    input.item.body.trim(),
    "",
    `---`,
    `### ${input.stage.name} (${result.agentName})`,
    result.content,
  ]
    .join("\n")
    .trim();

  await updateWorkItem({
    itemId: input.item.id,
    title: input.item.title,
    body: nextBody,
  });

  await appendSystemNote({
    processId: input.item.process_id,
    workItemId: input.item.id,
    content: result.content,
    authorName: result.agentName,
  });

  await addStageRunEvent({
    workItemId: input.item.id,
    processId: input.item.process_id,
    stageKey: input.stage.stage_key || input.stage.id,
    stageType: "agent",
    outcome: "done",
    summary: `${result.agentName} produced a ${input.stage.name} draft.`,
    createdBy: input.actorSub,
  });

  return {
    summary: `${result.agentName} produced a ${input.stage.name} draft.`,
    content: result.content,
  };
}

export async function runScriptStage(input: {
  item: WorkItem;
  stage: Stage;
  actorSub: string;
}): Promise<{ outcome: "success" | "failure"; summary: string }> {
  const config = stageConfig(input.stage);
  const path = asString(config.path) || undefined;
  const inline = asString(config.inline) || undefined;
  const result = runFlowScript({
    path,
    inline,
    title: input.item.title,
    body: input.item.body,
    stageKey: input.stage.stage_key || input.stage.id,
  });

  await appendSystemNote({
    processId: input.item.process_id,
    workItemId: input.item.id,
    content: result.summary,
    authorName: "Flow script",
  });

  await addStageRunEvent({
    workItemId: input.item.id,
    processId: input.item.process_id,
    stageKey: input.stage.stage_key || input.stage.id,
    stageType: "script",
    outcome: result.outcome,
    summary: result.summary,
    createdBy: input.actorSub,
  });

  return { outcome: result.outcome, summary: result.summary };
}

export async function advanceWorkItem(input: {
  itemId: string;
  outcome: AdvanceOutcome;
  actorSub: string;
  /** When true, run agent/script executor before transitioning. */
  execute?: boolean;
}): Promise<AdvanceResult> {
  const item = await getWorkItem(input.itemId);
  if (!item) throw new Error("Item not found");
  const process = await getProcess(item.process_id);
  if (!process) throw new Error("Process not found");

  const [stages, transitions] = await Promise.all([
    listStages(process.id),
    listStageTransitions(process.id),
  ]);
  const stage = stages.find((s) => s.id === item.stage_id);
  if (!stage) throw new Error("Current stage not found");

  const stageKey = stage.stage_key || stage.id;
  let outcome: string = input.outcome;
  let summary = "";

  if (input.execute) {
    if (stage.stage_type === "agent") {
      const agentResult = await runAgentStage({
        item,
        stage,
        actorSub: input.actorSub,
      });
      summary = agentResult.summary;
      outcome = "default";
      // Prefer explicit default edge; fall back to done label.
      if (!resolveTransition(transitions, stageKey, "default")) {
        outcome = "done";
      }
    } else if (stage.stage_type === "script") {
      const scriptResult = await runScriptStage({
        item: (await getWorkItem(item.id))!,
        stage,
        actorSub: input.actorSub,
      });
      summary = scriptResult.summary;
      outcome = scriptResult.outcome;
    } else if (stage.stage_type === "human") {
      throw new Error("Human stages require approve/reject, not execute");
    }
  } else if (stage.stage_type === "human") {
    if (outcome !== "approve" && outcome !== "reject") {
      throw new Error("Human gates require approve or reject");
    }
    const config = stageConfig(stage);
    summary =
      outcome === "approve"
        ? `Approved by ${input.actorSub}: ${asString(config.approves, stage.name)}`
        : `Rejected by ${input.actorSub}: returned for more work`;
    await addStageRunEvent({
      workItemId: item.id,
      processId: process.id,
      stageKey,
      stageType: "human",
      outcome,
      summary,
      createdBy: input.actorSub,
    });
    await appendSystemNote({
      processId: process.id,
      workItemId: item.id,
      content: summary,
      authorName: "Human gate",
    });
  }

  const edge = resolveTransition(transitions, stageKey, outcome);
  if (!edge) {
    // Terminal agent/script with no edges — mark done in place.
    if (outcome === "done" || outcome === "approve") {
      const completed = await setWorkItemStatus(item.id, "done");
      return {
        item: completed,
        fromStageKey: stageKey,
        toStageKey: null,
        outcome,
        summary: summary || "Marked complete.",
        completed: true,
      };
    }
    throw new Error(
      `No transition from ${stageKey} for outcome "${outcome}"`,
    );
  }

  if (edge.to_stage_key === "done") {
    const completed = await setWorkItemStatus(item.id, "done");
    return {
      item: completed,
      fromStageKey: stageKey,
      toStageKey: "done",
      outcome,
      summary: summary || "Flow completed.",
      completed: true,
    };
  }

  const nextStage = stages.find((s) => s.stage_key === edge.to_stage_key);
  if (!nextStage) {
    throw new Error(`Missing target stage: ${edge.to_stage_key}`);
  }

  const moved = await moveWorkItem(item.id, nextStage.id);
  if (moved.status === "done") {
    await setWorkItemStatus(item.id, "open");
  }

  return {
    item: (await getWorkItem(item.id))!,
    fromStageKey: stageKey,
    toStageKey: edge.to_stage_key,
    outcome,
    summary: summary || `Moved to ${nextStage.name}.`,
    completed: false,
  };
}
