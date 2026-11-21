"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import {
  formatFlowInputsBlock,
  getFlow,
  validateFlowInputs,
} from "@/lib/flows";
import {
  advanceWorkItem,
  type AdvanceOutcome,
} from "@/lib/flows/runtime";
import {
  addProcessFromTemplate,
  assertOrgAccess,
  assertProcessAccess,
  assertProductAccess,
  createProduct,
  createWorkItem,
  ensureOrgProcess,
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
  clearProductIntegration,
  upsertGithubIntegration,
} from "@/lib/integrations";
import {
  deleteOrganizationConnection,
  getOrganizationAccessToken,
} from "@/lib/integrations/connections";
import {
  getGithubOAuthAppConfig,
  githubOAuthConfigured,
  revokeGithubToken,
} from "@/lib/integrations/github/oauth";

function revalidateWorkPaths(input: {
  processId: string;
  productId?: string | null;
  itemId?: string;
}) {
  revalidatePath("/app/work");
  if (input.itemId) revalidatePath(`/app/work/${input.itemId}`);
  if (input.productId) {
    revalidatePath(
      `/app/products/${input.productId}/processes/${input.processId}`,
    );
  }
}

export async function createProductAction(formData: FormData) {
  const viewer = await requireViewer();
  const org = await ensureWorkspace(viewer);
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name) throw new Error("Product name is required");

  const product = await createProduct({
    organizationId: org.id,
    name,
    description,
    createdBy: viewer.sub,
  });
  redirect(`/app/products/${product.id}`);
}

export async function addProcessAction(formData: FormData) {
  const viewer = await requireViewer();
  const productId = String(formData.get("productId") ?? "");
  const templateKey = String(formData.get("templateKey") ?? "");
  const product = await assertProductAccess(productId, viewer.sub);
  if (!product) throw new Error("Forbidden");

  const process = await addProcessFromTemplate({
    productId,
    templateKey,
    createdBy: viewer.sub,
  });
  revalidatePath(`/app/products/${productId}`);
  redirect(`/app/products/${productId}/processes/${process.id}`);
}

export async function createWorkItemAction(formData: FormData) {
  const viewer = await requireViewer();
  const processId = String(formData.get("processId") ?? "");
  const stageId = String(formData.get("stageId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!title) throw new Error("Title is required");

  const process = await assertProcessAccess(processId, viewer.sub);
  if (!process) throw new Error("Forbidden");

  const stages = await listStages(processId);
  const flow = getFlow(process.template_key);
  const entry =
    (flow
      ? stages.find((s) => s.stage_key === flow.entry)
      : null) ??
    stages.find((s) => s.id === stageId) ??
    stages[0];
  if (!entry) throw new Error("No stages");

  const item = await createWorkItem({
    processId,
    stageId: entry.id,
    title,
    body,
    createdBy: viewer.sub,
  });
  revalidateWorkPaths({
    processId,
    productId: process.product_id,
    itemId: item.id,
  });
  return item.id;
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

  const title =
    validated.inputs.title?.trim() ||
    validated.inputs.goal?.trim() ||
    validated.inputs.opportunity?.trim() ||
    flow.name;
  const inputsBlock = formatFlowInputsBlock(validated.inputs, flow.inputs);
  const body = inputsBlock;

  const process = await ensureOrgProcess({
    organizationId: org.id,
    templateKey: flow.key,
    createdBy: viewer.sub,
  });
  const stages = await listStages(process.id);
  const entry =
    stages.find((s) => s.stage_key === flow.entry) ?? stages[0];
  if (!entry) return { error: "Flow has no entry stage" };

  const item = await createWorkItem({
    processId: process.id,
    stageId: entry.id,
    title,
    body,
    inputs: validated.inputs,
    createdBy: viewer.sub,
  });

  revalidateWorkPaths({
    processId: process.id,
    productId: null,
    itemId: item.id,
  });
  redirect(workItemHref({ id: item.id, process_id: process.id, product_id: null }));
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
  revalidateWorkPaths({
    processId: process.id,
    productId: process.product_id,
    itemId,
  });
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

  const result = await advanceWorkItem({
    itemId,
    outcome,
    actorSub: viewer.sub,
    execute,
  });
  revalidateWorkPaths({
    processId: process.id,
    productId: process.product_id,
    itemId,
  });
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
  revalidateWorkPaths({
    processId: process.id,
    productId: process.product_id,
    itemId,
  });
}

export async function saveGithubIntegrationAction(formData: FormData) {
  const viewer = await requireViewer();
  const productId = String(formData.get("productId") ?? "");
  const owner = String(formData.get("owner") ?? "").trim();
  const repo = String(formData.get("repo") ?? "").trim();
  const baseBranch = String(formData.get("baseBranch") ?? "main").trim();
  const headBranchPrefix = String(
    formData.get("headBranchPrefix") ?? "consol/",
  ).trim();

  const product = await assertProductAccess(productId, viewer.sub);
  if (!product) throw new Error("Forbidden");
  if (!owner || !repo) throw new Error("Owner and repository are required");

  await upsertGithubIntegration({
    productId,
    owner,
    repo,
    baseBranch,
    headBranchPrefix,
    createdBy: viewer.sub,
  });
  revalidatePath("/app/connectors");
  revalidatePath("/app/connectors/github");
  revalidatePath(`/app/products/${productId}`);
}

export async function clearGithubIntegrationAction(formData: FormData) {
  const viewer = await requireViewer();
  const productId = String(formData.get("productId") ?? "");
  const product = await assertProductAccess(productId, viewer.sub);
  if (!product) throw new Error("Forbidden");

  await clearProductIntegration(productId, "github");
  revalidatePath("/app/connectors");
  revalidatePath("/app/connectors/github");
  revalidatePath(`/app/products/${productId}`);
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

export async function startSoftwareDeliveryAction(input: {
  title: string;
  body?: string;
  productId?: string;
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
    productId: input.productId,
    runSpec: input.runSpec,
  });

  revalidatePath("/app");
  revalidatePath("/app/projects");
  revalidatePath(`/app/products/${result.product.id}`);
  revalidatePath(
    `/app/products/${result.product.id}/processes/${result.process.id}`,
  );

  return {
    productId: result.product.id,
    processId: result.process.id,
    itemId: result.item.id,
    href: result.href,
    title: result.item.title,
    stageSummary: result.specSummary ?? "Work item created.",
  };
}
