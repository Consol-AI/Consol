"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { getFlow, validateFlowInputs } from "@/lib/flows";
import {
  advanceWorkItem,
  queueCurrentStage,
  queueStageIfAutomated,
  type AdvanceOutcome,
} from "@/lib/flows/runtime";
import { startFlowWorkItem } from "@/lib/flows/start";
import {
  assertOrgAccess,
  assertProcessAccess,
  ensureWorkspace,
  getProcess,
  getWorkItem,
  isFlowBackedProcess,
  listStageTransitions,
  listStages,
  moveWorkItem,
  updateWorkItem,
} from "@/lib/factory";
import { workItemHref } from "@/lib/work-links";
import {
  deleteOrganizationConnection,
  getOrganizationAccessToken,
} from "@/lib/integrations/connections";
import {
  getGithubOAuthAppConfig,
  githubOAuthConfigured,
  revokeGithubToken,
} from "@/lib/integrations/github/oauth";

function revalidateWorkPaths(input: { itemId?: string }) {
  revalidatePath("/app/work");
  if (input.itemId) revalidatePath(`/app/work/${input.itemId}`);
}

export type StartWorkFlowState = {
  error?: string;
};

export async function startWorkFlowAction(
  _prev: StartWorkFlowState,
  formData: FormData,
): Promise<StartWorkFlowState> {
  const viewer = await requireViewer();
  const org = await ensureWorkspace(viewer);
  if (!(await assertOrgAccess(org.id, viewer.sub))) {
    return { error: "Forbidden" };
  }

  const flowKey = String(formData.get("flowKey") ?? "").trim();
  const flow = getFlow(flowKey);
  if (!flow) return { error: "Unknown flow" };

  const rawInputs: Record<string, string> = {};
  for (const field of flow.inputs) {
    rawInputs[field.key] = String(formData.get(`input:${field.key}`) ?? "");
  }
  const validated = validateFlowInputs(flow.inputs, rawInputs);
  if (!validated.ok) return { error: validated.error };

  let item;
  try {
    ({ item } = await startFlowWorkItem({
      organizationId: org.id,
      actorSub: viewer.sub,
      flow,
      inputs: validated.inputs,
    }));
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not start flow",
    };
  }

  revalidateWorkPaths({ itemId: item.id });
  redirect(workItemHref(item));
}

export async function moveWorkItemAction(formData: FormData) {
  const viewer = await requireViewer();
  const itemId = String(formData.get("itemId") ?? "");
  const stageId = String(formData.get("stageId") ?? "");
  const item = await getWorkItem(itemId);
  if (!item) throw new Error("Item not found");
  const process = await assertProcessAccess(item.process_id, viewer.sub);
  if (!process) throw new Error("Forbidden");

  if (isFlowBackedProcess(process)) {
    const [stages, transitions] = await Promise.all([
      listStages(process.id),
      listStageTransitions(process.id),
    ]);
    const current = stages.find((s) => s.id === item.stage_id);
    const target = stages.find((s) => s.id === stageId);
    if (!current || !target) throw new Error("Invalid stage");
    const allowed = transitions.some(
      (t) =>
        t.from_stage_key === (current.stage_key || current.id) &&
        t.to_stage_key === (target.stage_key || target.id),
    );
    if (!allowed) {
      throw new Error("Illegal transition for this flow");
    }
  }

  await moveWorkItem(itemId, stageId);
  const target = (await listStages(process.id)).find((s) => s.id === stageId);
  if (target) {
    await queueStageIfAutomated({ itemId, stage: target, actorSub: viewer.sub });
  }
  revalidateWorkPaths({ itemId });
}

export async function advanceWorkItemAction(formData: FormData) {
  const viewer = await requireViewer();
  const itemId = String(formData.get("itemId") ?? "");
  const outcome = String(formData.get("outcome") ?? "default") as AdvanceOutcome;
  const execute = String(formData.get("execute") ?? "") === "1";
  const item = await getWorkItem(itemId);
  if (!item) throw new Error("Item not found");
  const process = await assertProcessAccess(item.process_id, viewer.sub);
  if (!process) throw new Error("Forbidden");

  const result = execute
    ? await queueCurrentStage({ itemId, actorSub: viewer.sub })
    : await advanceWorkItem({
        itemId,
        outcome,
        actorSub: viewer.sub,
        execute: false,
      });
  revalidateWorkPaths({ itemId });
  return result;
}

export async function updateWorkItemAction(formData: FormData) {
  const viewer = await requireViewer();
  const itemId = String(formData.get("itemId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const item = await getWorkItem(itemId);
  if (!item) throw new Error("Item not found");
  const process = await assertProcessAccess(item.process_id, viewer.sub);
  if (!process) throw new Error("Forbidden");

  await updateWorkItem({ itemId, title, body });
  revalidateWorkPaths({ itemId });
}

export type FlowControlResult = {
  ok: boolean;
  summary: string;
  warnings?: string[];
};

/** Stop a flow: cancel queued/running jobs and external agents. Idempotent. */
export async function stopWorkItemAction(
  formData: FormData,
): Promise<FlowControlResult> {
  const viewer = await requireViewer();
  const itemId = String(formData.get("itemId") ?? "");
  const item = await getWorkItem(itemId);
  if (!item) return { ok: false, summary: "This flow no longer exists." };
  const process = await assertProcessAccess(item.process_id, viewer.sub);
  if (!process) throw new Error("Forbidden");

  const { stopWorkItem } = await import("@/lib/flows/stop");
  const result = await stopWorkItem({ itemId, actorSub: viewer.sub });
  revalidateWorkPaths({ itemId });
  if (item.status === "done") {
    return { ok: true, summary: "This flow already finished." };
  }
  return {
    ok: true,
    summary: result.stopped
      ? "Flow stopped. Running work was cancelled."
      : "Flow is already stopped.",
    warnings: result.warnings,
  };
}

/** Stop (if running) and soft-delete a flow. Idempotent. */
export async function deleteWorkItemAction(
  formData: FormData,
): Promise<FlowControlResult> {
  const viewer = await requireViewer();
  const itemId = String(formData.get("itemId") ?? "");
  const item = await getWorkItem(itemId);
  if (!item) return { ok: true, summary: "Flow deleted." };
  const process = await assertProcessAccess(item.process_id, viewer.sub);
  if (!process) throw new Error("Forbidden");

  const { deleteWorkItem } = await import("@/lib/flows/stop");
  const result = await deleteWorkItem({ itemId, actorSub: viewer.sub });
  revalidateWorkPaths({ itemId });
  return {
    ok: true,
    summary: "Flow deleted.",
    warnings: result.stop.warnings,
  };
}

export async function disconnectGithubOauthAction() {
  const viewer = await requireViewer();
  const org = await ensureWorkspace(viewer);
  if (!(await assertOrgAccess(org.id, viewer.sub))) {
    throw new Error("Forbidden");
  }

  const token = await getOrganizationAccessToken(org.id, "github");
  const deleted = await deleteOrganizationConnection(org.id, "github");
  if (deleted && token && githubOAuthConfigured()) {
    try {
      const { clientId, clientSecret } = getGithubOAuthAppConfig();
      await revokeGithubToken({ clientId, clientSecret, accessToken: token });
    } catch {
      // Local row already removed; revoke is best-effort.
    }
  }

  revalidatePath("/app/connectors");
  revalidatePath("/app/connectors/github");
}

export async function saveCursorApiKeyAction(formData: FormData) {
  const viewer = await requireViewer();
  const org = await ensureWorkspace(viewer);
  if (!(await assertOrgAccess(org.id, viewer.sub))) {
    throw new Error("Forbidden");
  }
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  if (!apiKey) throw new Error("Cursor API key is required");

  const { saveCursorApiKey } = await import(
    "@/lib/integrations/cursor/credentials"
  );
  await saveCursorApiKey({
    organizationId: org.id,
    apiKey,
    createdBy: viewer.sub,
  });
  revalidatePath("/app/connectors");
  revalidatePath("/app/connectors/cursor");
}

export async function clearCursorApiKeyAction() {
  const viewer = await requireViewer();
  const org = await ensureWorkspace(viewer);
  if (!(await assertOrgAccess(org.id, viewer.sub))) {
    throw new Error("Forbidden");
  }
  const { clearCursorApiKey } = await import(
    "@/lib/integrations/cursor/credentials"
  );
  await clearCursorApiKey(org.id);
  revalidatePath("/app/connectors");
  revalidatePath("/app/connectors/cursor");
}

export async function saveModelPreferenceAction(formData: FormData) {
  await requireViewer();
  const modelRef = String(formData.get("modelRef") ?? "").trim();
  if (!modelRef) throw new Error("Model ref is required");

  const { isModelRefConfigured, writeModelPreference } = await import(
    "@/lib/models"
  );
  if (!isModelRefConfigured(modelRef)) {
    throw new Error(
      `Model ${modelRef} is not configured. Check the provider API key.`,
    );
  }
  await writeModelPreference(modelRef);
  revalidatePath("/app");
  revalidatePath("/app/connectors");
  revalidatePath("/app/connectors/models");
}

export async function clearModelPreferenceAction() {
  await requireViewer();
  const { clearModelPreference } = await import("@/lib/models");
  await clearModelPreference();
  revalidatePath("/app");
  revalidatePath("/app/connectors");
  revalidatePath("/app/connectors/models");
}

export async function startSoftwareDeliveryAction(input: {
  title: string;
  body?: string;
  repo?: string;
  runSpec?: boolean;
}) {
  const viewer = await requireViewer();
  const org = await ensureWorkspace(viewer);
  if (!(await assertOrgAccess(org.id, viewer.sub))) {
    throw new Error("Forbidden");
  }

  const { startSoftwareDelivery } = await import("@/lib/delivery/start");
  const result = await startSoftwareDelivery({
    organizationId: org.id,
    actorSub: viewer.sub,
    title: input.title,
    body: input.body,
    repo: input.repo,
    runSpec: input.runSpec,
  });

  revalidatePath("/app");
  revalidateWorkPaths({ itemId: result.item.id });

  return {
    processId: result.process.id,
    itemId: result.item.id,
    href: result.href,
    title: result.item.title,
    stageSummary: result.specSummary ?? "Work item created.",
  };
}
