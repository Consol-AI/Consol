import type { Stage, StageTransition } from "@/lib/factory";

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
