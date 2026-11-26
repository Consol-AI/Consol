import type { Stage, WorkItem } from "@/lib/factory";

export type AttentionBucket =
  | "needs_you"
  | "agents_working"
  | "waiting"
  | "done";

export const ATTENTION_LABELS: Record<AttentionBucket, string> = {
  needs_you: "Needs you",
  agents_working: "Agents working",
  waiting: "Waiting",
  done: "Done",
};

export const ATTENTION_ORDER: AttentionBucket[] = [
  "needs_you",
  "agents_working",
  "waiting",
  "done",
];

export function attentionBucketForItem(
  item: WorkItem,
  stageById: Map<string, Stage>,
): AttentionBucket {
  // Stopped flows are finished too: nothing for anyone to act on.
  if (item.status === "done" || item.status === "stopped") return "done";
  const stage = stageById.get(item.stage_id);
  if (!stage) return "waiting";
  if (stage.stage_type === "human") return "needs_you";
  if (stage.stage_type === "agent") return "agents_working";
  if (stage.stage_type === "script") {
    const key = stage.stage_key || "";
    // Cursor build / CI validate count as agent work in the attention rail.
    if (key === "build" || key === "validate" || key === "cursor-build") {
      return "agents_working";
    }
    return "waiting";
  }
  // Legacy free-move stages still need a human to nudge them.
  if (stage.stage_type === "legacy" || !stage.stage_type) return "needs_you";
  return "waiting";
}

export function groupIssuesByAttention(
  items: WorkItem[],
  stages: Stage[],
): Record<AttentionBucket, WorkItem[]> {
  const stageById = new Map(stages.map((s) => [s.id, s]));
  const groups: Record<AttentionBucket, WorkItem[]> = {
    needs_you: [],
    agents_working: [],
    waiting: [],
    done: [],
  };
  for (const item of items) {
    groups[attentionBucketForItem(item, stageById)].push(item);
  }
  return groups;
}

export function attentionCounts(
  items: WorkItem[],
  stages: Stage[],
): Record<AttentionBucket, number> {
  const groups = groupIssuesByAttention(items, stages);
  return {
    needs_you: groups.needs_you.length,
    agents_working: groups.agents_working.length,
    waiting: groups.waiting.length,
    done: groups.done.length,
  };
}
