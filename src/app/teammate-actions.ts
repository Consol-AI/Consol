"use server";

import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { BLANK_DEFAULTS, getPreset, isValidSlug } from "@/lib/teammates/presets";
import { createTeammateRecord } from "@/lib/teammates/registry";
import { scaffoldTeammateAgent } from "@/lib/teammates/scaffold";
import type { CreateTeammateInput } from "@/lib/teammates/types";

export type CreateTeammateState = {
  error?: string;
};

export async function createTeammateAction(
  _prev: CreateTeammateState,
  formData: FormData,
): Promise<CreateTeammateState> {
  try {
    await requireViewer();
  } catch {
    return { error: "Sign in required. Set CONSOL_DEMO_AUTH=1 locally." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase();
  const presetIdRaw = String(formData.get("presetId") ?? "").trim();
  const presetId = presetIdRaw || null;
  const role = String(formData.get("role") ?? "").trim();
  const brief = String(formData.get("brief") ?? "").trim();
  const modelId = String(formData.get("modelId") ?? "").trim();

  if (!name) return { error: "Name is required." };
  if (!isValidSlug(slug)) {
    return {
      error: "Slug must be lowercase letters, numbers, and hyphens.",
    };
  }
  if (!brief) return { error: "Brief is required." };
  if (!modelId) return { error: "Model is required." };

  const preset = presetId ? getPreset(presetId) : undefined;
  if (presetId && !preset) return { error: "Unknown preset." };

  const toolsRaw = String(formData.get("tools") ?? "");
  const tools = toolsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const resolvedTools =
    tools.length > 0
      ? tools
      : (preset?.tools ?? BLANK_DEFAULTS.tools);

  const input: CreateTeammateInput = {
    name,
    slug,
    presetId,
    role: role || preset?.role || BLANK_DEFAULTS.role,
    brief,
    modelId,
    modelParams: preset?.model.params ?? BLANK_DEFAULTS.model.params,
    tools: resolvedTools,
  };

  try {
    await scaffoldTeammateAgent(input);
    await createTeammateRecord(input);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create teammate.";
    return { error: message };
  }

  redirect(`/app/teammates/${slug}`);
}
