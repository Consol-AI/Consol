import { invokeAgent } from "@/lib/agents";
import type { AgentToolName } from "@/lib/agents/types";
import { FlowStoppedError, isStoppedStatus } from "@/lib/flows/errors";
import { runFlowScript } from "@/lib/flows/scripts";
import { cancelAgentRunsForWorkItem } from "@/lib/flows/stop";
import { enqueueStageExecution } from "@/lib/jobs/enqueue";
import {
  resolveTransition,
  targetStageKeyForOutcome,
} from "@/lib/flows/transitions";
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
  | "pending"
  | "done";

export type AdvanceResult = {
  item: WorkItem;
  fromStageKey: string;
  toStageKey: string | null;
  outcome: string;
  summary: string;
  completed: boolean;
  /** True when a script/agent is still running and the item did not advance. */
  pending?: boolean;
};

export {
  legalOutcomesForStage,
  resolveTransition,
  targetStageKeyForOutcome,
} from "@/lib/flows/transitions";

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asToolList(value: unknown): AgentToolName[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is AgentToolName => typeof v === "string");
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

/**
 * Throw if the item was stopped/deleted or the job was cancelled. Called
 * before any write that follows long-running work.
 */
async function assertStillRunning(
  itemId: string,
  signal?: AbortSignal,
): Promise<WorkItem> {
  if (signal?.aborted) throw new FlowStoppedError();
  const item = await getWorkItem(itemId);
  if (!item || isStoppedStatus(item.status)) throw new FlowStoppedError();
  return item;
}

export async function runAgentStage(input: {
  item: WorkItem;
  stage: Stage;
  actorSub: string;
  signal?: AbortSignal;
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
    workItemInputs: input.item.inputs,
    stageName: input.stage.name,
    signal: input.signal,
  });

  // Stopped while the agent was thinking: drop its output.
  await assertStillRunning(input.item.id, input.signal);

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
  productId?: string;
  signal?: AbortSignal;
}): Promise<{
  outcome: "success" | "failure" | "pending";
  summary: string;
}> {
  const config = stageConfig(input.stage);
  const path = asString(config.path) || undefined;
  const inline = asString(config.inline) || undefined;
  const result = await runFlowScript({
    path,
    inline,
    title: input.item.title,
    body: input.item.body,
    inputs: input.item.inputs,
    stageKey: input.stage.stage_key || input.stage.id,
    productId: input.productId,
    processId: input.item.process_id,
    workItemId: input.item.id,
    actorSub: input.actorSub,
  });

  try {
    await assertStillRunning(input.item.id, input.signal);
  } catch (error) {
    // The script may have launched an external agent after the stop swept
    // the item's runs (e.g. Cursor build); stop that one too.
    await cancelAgentRunsForWorkItem({
      workItemId: input.item.id,
      processId: input.item.process_id,
      actorSub: input.actorSub,
    }).catch(() => {});
    throw error;
  }

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
    metadata: { path: path ?? null },
  });

  return { outcome: result.outcome, summary: result.summary };
}

/** Agent and script stages run on the worker; human/legacy stages wait. */
export function isAutomatedStage(stage: Pick<Stage, "stage_type">): boolean {
  return stage.stage_type === "agent" || stage.stage_type === "script";
}

/**
 * Queue an agent/script stage the moment an item lands on it, so flows run
 * end to end without anyone pressing "run". No-op for human stages; deduped
 * while a job for the same item + stage is queued or running.
 */
export async function queueStageIfAutomated(input: {
  itemId: string;
  stage: Stage;
  actorSub: string;
}): Promise<boolean> {
  if (!isAutomatedStage(input.stage)) return false;
  await enqueueStageExecution({
    itemId: input.itemId,
    stageId: input.stage.id,
    actorSub: input.actorSub,
  });
  return true;
}

/**
 * Queue the item's current agent/script stage for the worker. Returns
 * immediately; progress shows up as stage run events and messages.
 */
export async function queueCurrentStage(input: {
  itemId: string;
  actorSub: string;
}): Promise<AdvanceResult> {
  const item = await getWorkItem(input.itemId);
  if (!item) throw new Error("Item not found");
  const stage = (await listStages(item.process_id)).find(
    (s) => s.id === item.stage_id,
  );
  if (!stage) throw new Error("Current stage not found");
  if (stage.stage_type === "human") {
    throw new Error("Human stages require approve/reject, not execute");
  }
  if (isStoppedStatus(item.status)) throw new FlowStoppedError();
  const stageKey = stage.stage_key || stage.id;
  const job = await enqueueStageExecution({
    itemId: item.id,
    stageId: stage.id,
    actorSub: input.actorSub,
  });
  return {
    item,
    fromStageKey: stageKey,
    toStageKey: stageKey,
    outcome: "pending",
    summary: job
      ? `${stage.name} queued — the worker will pick it up shortly.`
      : `${stage.name} is already running.`,
    completed: false,
    pending: true,
  };
}

export async function advanceWorkItem(input: {
  itemId: string;
  outcome: AdvanceOutcome;
  actorSub: string;
  /** When true, run agent/script executor before transitioning. */
  execute?: boolean;
  /** Aborts in-flight agent work when the flow is stopped. */
  signal?: AbortSignal;
}): Promise<AdvanceResult> {
  const item = await getWorkItem(input.itemId);
  if (!item) throw new Error("Item not found");
  if (isStoppedStatus(item.status)) throw new FlowStoppedError();
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
        signal: input.signal,
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
        productId: process.product_id ?? undefined,
        signal: input.signal,
      });
      summary = scriptResult.summary;
      outcome = scriptResult.outcome;
      if (scriptResult.outcome === "pending") {
        return {
          item: (await getWorkItem(item.id))!,
          fromStageKey: stageKey,
          toStageKey: stageKey,
          outcome: "pending",
          summary,
          completed: false,
          pending: true,
        };
      }
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

  // Every flow stage runs on its own: entering an agent/script stage queues
  // it for the worker (spec → build → validate → merge, review loops, etc).
  if (
    await queueStageIfAutomated({
      itemId: item.id,
      stage: nextStage,
      actorSub: input.actorSub,
    })
  ) {
    return {
      item: (await getWorkItem(item.id))!,
      fromStageKey: stageKey,
      toStageKey: edge.to_stage_key,
      outcome,
      summary: `${summary || `Moved to ${nextStage.name}.`} ${nextStage.name} queued.`,
      completed: false,
    };
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
