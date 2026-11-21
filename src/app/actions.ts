"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { getFlow } from "@/lib/flows";
import {
  advanceWorkItem,
  type AdvanceOutcome,
} from "@/lib/flows/runtime";
import {
  addProcessFromTemplate,
  assertProductAccess,
  createProduct,
  createWorkItem,
  ensureWorkspace,
  getProcess,
  getWorkItem,
  isFlowBackedProcess,
  listStageTransitions,
  listStages,
  moveWorkItem,
  updateWorkItem,
} from "@/lib/factory";
import {
  clearProductIntegration,
  upsertGithubIntegration,
} from "@/lib/integrations";

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

  const process = await getProcess(processId);
  if (!process) throw new Error("Process not found");
  const product = await assertProductAccess(process.product_id, viewer.sub);
  if (!product) throw new Error("Forbidden");

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
  revalidatePath(`/app/products/${product.id}/processes/${processId}`);
  return item.id;
}

export async function moveWorkItemAction(formData: FormData) {
  const viewer = await requireViewer();
  const itemId = String(formData.get("itemId") ?? "");
  const stageId = String(formData.get("stageId") ?? "");
  const item = await getWorkItem(itemId);
  if (!item) throw new Error("Item not found");
  const process = await getProcess(item.process_id);
  if (!process) throw new Error("Process not found");
  const product = await assertProductAccess(process.product_id, viewer.sub);
  if (!product) throw new Error("Forbidden");

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
  revalidatePath(`/app/products/${product.id}/processes/${process.id}`);
}

export async function advanceWorkItemAction(formData: FormData) {
  const viewer = await requireViewer();
  const itemId = String(formData.get("itemId") ?? "");
  const outcome = String(formData.get("outcome") ?? "default") as AdvanceOutcome;
  const execute = String(formData.get("execute") ?? "") === "1";
  const item = await getWorkItem(itemId);
  if (!item) throw new Error("Item not found");
  const process = await getProcess(item.process_id);
  if (!process) throw new Error("Process not found");
  const product = await assertProductAccess(process.product_id, viewer.sub);
  if (!product) throw new Error("Forbidden");

  const result = await advanceWorkItem({
    itemId,
    outcome,
    actorSub: viewer.sub,
    execute,
  });
  revalidatePath(`/app/products/${product.id}/processes/${process.id}`);
  return result;
}

export async function updateWorkItemAction(formData: FormData) {
  const viewer = await requireViewer();
  const itemId = String(formData.get("itemId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const item = await getWorkItem(itemId);
  if (!item) throw new Error("Item not found");
  const process = await getProcess(item.process_id);
  if (!process) throw new Error("Process not found");
  const product = await assertProductAccess(process.product_id, viewer.sub);
  if (!product) throw new Error("Forbidden");

  await updateWorkItem({ itemId, title, body });
  revalidatePath(`/app/products/${product.id}/processes/${process.id}`);
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
  revalidatePath(`/app/products/${productId}`);
}

export async function clearGithubIntegrationAction(formData: FormData) {
  const viewer = await requireViewer();
  const productId = String(formData.get("productId") ?? "");
  const product = await assertProductAccess(productId, viewer.sub);
  if (!product) throw new Error("Forbidden");

  await clearProductIntegration(productId, "github");
  revalidatePath(`/app/products/${productId}`);
}
