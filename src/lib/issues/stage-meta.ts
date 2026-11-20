import { Bot, GitBranch, ShieldCheck, Terminal } from "lucide-react";
import type { Stage, StageRunEvent } from "@/lib/factory";

export function stageMeta(type: string): {
  label: string;
  icon: typeof Bot;
  badgeClass: string;
  railClass: string;
} {
  if (type === "agent") {
    return {
      label: "Agent",
      icon: Bot,
      badgeClass:
        "border-transparent bg-[var(--console-accent-soft)] text-[var(--console-accent)]",
      railClass: "bg-[var(--console-accent)]",
    };
  }
  if (type === "human") {
    return {
      label: "Human gate",
      icon: ShieldCheck,
      badgeClass: "border-transparent bg-amber-50 text-amber-800",
      railClass: "bg-amber-500",
    };
  }
  if (type === "script") {
    return {
      label: "Script",
      icon: Terminal,
      badgeClass: "border-transparent bg-slate-100 text-slate-700",
      railClass: "bg-slate-500",
    };
  }
  return {
    label: "Stage",
    icon: GitBranch,
    badgeClass:
      "border-transparent bg-[var(--console-panel)] text-[var(--console-muted)]",
    railClass: "bg-[var(--console-faint)]",
  };
}

export type StageProgressState = "past" | "current" | "upcoming";

export function stageProgressState(
  stages: Stage[],
  itemStageId: string,
  itemStatus: string,
  stage: Stage,
): StageProgressState {
  if (itemStatus === "done") return "past";
  const ordered = [...stages].sort((a, b) => a.position - b.position);
  const currentIndex = ordered.findIndex((s) => s.id === itemStageId);
  const index = ordered.findIndex((s) => s.id === stage.id);
  if (index < 0) return "upcoming";
  if (stage.id === itemStageId) return "current";
  if (currentIndex < 0) return "upcoming";
  return index < currentIndex ? "past" : "upcoming";
}

export function latestEventForStage(
  events: StageRunEvent[],
  stage: Stage,
): StageRunEvent | undefined {
  const key = stage.stage_key || stage.id;
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (events[i].stage_key === key) return events[i];
  }
  return undefined;
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const delta = Date.now() - then;
  const minutes = Math.round(delta / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
