import { cache } from "react";
import { sql } from "@/lib/db";
import { getFlow, listFlows } from "@/lib/flows";
import { parseStageConfig } from "@/lib/flows/stage-config";
import type { FlowDefinition, FlowStage, StageType } from "@/lib/flows/types";
import { normalizeTransitions } from "@/lib/flows/types";
import { createId } from "@/lib/id";
import { PROCESS_TEMPLATES } from "@/lib/templates";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  created_by: string;
  created_at: string;
};

export type Product = {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  created_by: string;
  created_at: string;
};

export type Process = {
  id: string;
  product_id: string | null;
  organization_id: string;
  name: string;
  domain: string;
  template_key: string;
  created_by: string;
  created_at: string;
};

export type Stage = {
  id: string;
  process_id: string;
  name: string;
  position: number;
  description: string;
  stage_key: string;
  stage_type: StageType | "legacy" | string;
  config: Record<string, unknown> | string;
};

export type StageTransition = {
  id: string;
  process_id: string;
  from_stage_key: string;
  to_stage_key: string;
  when_label: string;
};

export type StageRunEvent = {
  id: string;
  work_item_id: string;
  process_id: string;
  stage_key: string;
  stage_type: string;
  outcome: string;
  summary: string;
  metadata?: Record<string, unknown> | string;
  created_by: string;
  created_at: string;
};

export function stageConfig(stage: Stage): Record<string, unknown> {
  return parseStageConfig(stage.config);
}

function stageRowConfig(stage: FlowStage): Record<string, unknown> {
  if (stage.type === "agent") {
    return {
      rolePrompt: stage.rolePrompt,
      allowedTools: stage.allowedTools,
      agentKey: stage.agentKey ?? "forge",
    };
  }
  if (stage.type === "human") {
    return {
      responsible: stage.responsible,
      approves: stage.approves,
    };
  }
  return {
    path: stage.path ?? null,
    inline: stage.inline ?? null,
  };
}

export type WorkItem = {
  id: string;
  process_id: string;
  stage_id: string;
  title: string;
  body: string;
  inputs: Record<string, string>;
  status: string;
  assignee_sub: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  organization_id: string | null;
  process_id: string | null;
  work_item_id: string | null;
  role: string;
  content: string;
  author_sub: string | null;
  author_name: string;
  created_at: string;
};

/** Compact row for home-chat / Work coordination context. */
export type WorkspaceAttentionItem = {
  id: string;
  title: string;
  status: string;
  stage_name: string;
  stage_type: string;
  process_id: string;
  process_name: string;
  template_key: string;
  product_id: string | null;
  product_name: string | null;
  updated_at: string;
};

export type OrganizationWorkItem = WorkspaceAttentionItem & {
  inputs: Record<string, string>;
};

function parseWorkItemInputs(raw: unknown): Record<string, string> {
  if (!raw) return {};
  const value =
    typeof raw === "string"
      ? (JSON.parse(raw) as Record<string, unknown>)
      : (raw as Record<string, unknown>);
  const inputs: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value ?? {})) {
    if (typeof entry === "string") inputs[key] = entry;
  }
  return inputs;
}

function normalizeWorkItem(row: WorkItem): WorkItem {
  return {
    ...row,
    inputs: parseWorkItemInputs(row.inputs),
  };
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "workspace"
  );
}

async function ensureWorkspaceUncached(viewer: {
  sub: string;
  name: string;
  email: string;
}): Promise<Organization> {
  const existing = await sql<Organization>(
    `select o.* from organizations o
     join memberships m on m.organization_id = o.id
     where m.user_sub = $1
     order by o.created_at asc
     limit 1`,
    [viewer.sub],
  );
  if (existing[0]) return existing[0];

  const orgId = createId("org");
  const baseName = viewer.name?.split(" ")[0]
    ? `${viewer.name.split(" ")[0]}'s Factory`
    : "My Factory";
  let slug = slugify(baseName);
  const clash = await sql<{ id: string }>(
    `select id from organizations where slug = $1 limit 1`,
    [slug],
  );
  if (clash[0]) slug = `${slug}-${orgId.slice(-6)}`;

  try {
    await sql(
      `insert into organizations (id, name, slug, created_by) values ($1, $2, $3, $4)`,
      [orgId, baseName, slug, viewer.sub],
    );
  } catch {
    // Concurrent first visits can race on slug; re-read membership workspace.
    const raced = await sql<Organization>(
      `select o.* from organizations o
       join memberships m on m.organization_id = o.id
       where m.user_sub = $1
       order by o.created_at asc
       limit 1`,
      [viewer.sub],
    );
    if (raced[0]) return raced[0];
    slug = `${slugify(baseName)}-${orgId.slice(-6)}`;
    await sql(
      `insert into organizations (id, name, slug, created_by) values ($1, $2, $3, $4)`,
      [orgId, baseName, slug, viewer.sub],
    );
  }
  await sql(
    `insert into memberships (id, organization_id, user_sub, display_name, email, role)
     values ($1, $2, $3, $4, $5, 'admin')
     on conflict (organization_id, user_sub) do nothing`,
    [createId("mem"), orgId, viewer.sub, viewer.name, viewer.email],
  );

  const org = (
    await sql<Organization>(`select * from organizations where id = $1`, [orgId])
  )[0];
  if (org) return org;

  const fallback = await sql<Organization>(
    `select o.* from organizations o
     join memberships m on m.organization_id = o.id
     where m.user_sub = $1
     order by o.created_at asc
     limit 1`,
    [viewer.sub],
  );
  return fallback[0]!;
}

/**
 * Per-request memo keyed by identity fields so layout + page share one DB hit.
 * Primitive args keep React `cache` identity stable across call sites.
 */
const ensureWorkspaceByIdentity = cache(
  async (sub: string, name: string, email: string): Promise<Organization> =>
    ensureWorkspaceUncached({ sub, name, email }),
);

export async function ensureWorkspace(viewer: {
  sub: string;
  name: string;
  email: string;
}): Promise<Organization> {
  return ensureWorkspaceByIdentity(viewer.sub, viewer.name, viewer.email);
}

export type Member = {
  id: string;
  organization_id: string;
  user_sub: string;
  display_name: string;
  email: string;
  role: string;
  created_at: string;
};

export async function listProducts(organizationId: string): Promise<Product[]> {
  return sql<Product>(
    `select * from products where organization_id = $1 order by created_at desc`,
    [organizationId],
  );
}

export async function listMembers(organizationId: string): Promise<Member[]> {
  return sql<Member>(
    `select * from memberships where organization_id = $1 order by created_at asc`,
    [organizationId],
  );
}

export async function createProduct(input: {
  organizationId: string;
  name: string;
  description: string;
  createdBy: string;
}): Promise<Product> {
  const id = createId("prd");
  await sql(
    `insert into products (id, organization_id, name, description, created_by)
     values ($1, $2, $3, $4, $5)`,
    [
      id,
      input.organizationId,
      input.name.trim(),
      input.description.trim(),
      input.createdBy,
    ],
  );
  return (await sql<Product>(`select * from products where id = $1`, [id]))[0];
}

export async function getProduct(productId: string): Promise<Product | null> {
  return (
    (await sql<Product>(`select * from products where id = $1`, [productId]))[0] ??
    null
  );
}

export async function listProcesses(productId: string): Promise<Process[]> {
  return sql<Process>(
    `select * from processes where product_id = $1 order by created_at asc`,
    [productId],
  );
}

export async function getProcess(processId: string): Promise<Process | null> {
  return (
    (
      await sql<Process>(`select * from processes where id = $1`, [processId])
    )[0] ?? null
  );
}

export async function addProcessFromTemplate(input: {
  productId: string;
  templateKey: string;
  createdBy: string;
}): Promise<Process> {
  const flow = getFlow(input.templateKey);
  if (!flow) throw new Error("Unknown template");
  const product = await getProduct(input.productId);
  if (!product) throw new Error("Product not found");
  return addProcessFromFlow({
    productId: input.productId,
    organizationId: product.organization_id,
    flow,
    createdBy: input.createdBy,
  });
}

export async function addProcessFromFlow(input: {
  productId: string | null;
  organizationId: string;
  flow: FlowDefinition;
  createdBy: string;
}): Promise<Process> {
  const { flow } = input;
  const processId = createId("prc");
  await sql(
    `insert into processes (
       id, product_id, organization_id, name, domain, template_key, created_by
     ) values ($1, $2, $3, $4, $5, $6, $7)`,
    [
      processId,
      input.productId,
      input.organizationId,
      flow.name,
      flow.domain,
      flow.key,
      input.createdBy,
    ],
  );

  for (const [index, stage] of flow.stages.entries()) {
    await sql(
      `insert into stages (
         id, process_id, name, position, description,
         stage_key, stage_type, config
       ) values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        createId("stg"),
        processId,
        stage.name,
        index,
        stage.description ?? "",
        stage.id,
        stage.type,
        JSON.stringify(stageRowConfig(stage)),
      ],
    );
  }

  for (const stage of flow.stages) {
    for (const edge of normalizeTransitions(flow.transitions, stage.id)) {
      await sql(
        `insert into stage_transitions (
           id, process_id, from_stage_key, to_stage_key, when_label
         ) values ($1, $2, $3, $4, $5)`,
        [
          createId("trn"),
          processId,
          stage.id,
          edge.next,
          edge.when,
        ],
      );
    }
  }

  return (await getProcess(processId))!;
}

export async function listStages(processId: string): Promise<Stage[]> {
  return sql<Stage>(
    `select * from stages where process_id = $1 order by position asc`,
    [processId],
  );
}

export async function listStageTransitions(
  processId: string,
): Promise<StageTransition[]> {
  return sql<StageTransition>(
    `select * from stage_transitions where process_id = $1`,
    [processId],
  );
}

export async function addStageRunEvent(input: {
  workItemId: string;
  processId: string;
  stageKey: string;
  stageType: string;
  outcome: string;
  summary: string;
  createdBy: string;
  metadata?: Record<string, unknown>;
}): Promise<StageRunEvent> {
  const id = createId("sre");
  await sql(
    `insert into stage_run_events (
       id, work_item_id, process_id, stage_key, stage_type,
       outcome, summary, created_by, metadata
     ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
    [
      id,
      input.workItemId,
      input.processId,
      input.stageKey,
      input.stageType,
      input.outcome,
      input.summary,
      input.createdBy,
      JSON.stringify(input.metadata ?? {}),
    ],
  );
  return (
    await sql<StageRunEvent>(`select * from stage_run_events where id = $1`, [
      id,
    ])
  )[0];
}

export async function listStageRunEvents(
  workItemId: string,
): Promise<StageRunEvent[]> {
  return sql<StageRunEvent>(
    `select * from stage_run_events where work_item_id = $1 order by created_at asc`,
    [workItemId],
  );
}

/** Latest stage run event per work item, in one query. */
export async function listLatestStageRunEvents(
  workItemIds: string[],
): Promise<StageRunEvent[]> {
  if (workItemIds.length === 0) return [];
  return sql<StageRunEvent>(
    `select distinct on (work_item_id) * from stage_run_events
     where work_item_id = any($1::text[])
     order by work_item_id, created_at desc`,
    [workItemIds],
  );
}

export async function setWorkItemStatus(
  itemId: string,
  status: string,
): Promise<WorkItem> {
  await sql(
    `update work_items set status = $1, updated_at = now() where id = $2`,
    [status, itemId],
  );
  return (await getWorkItem(itemId))!;
}

export function isFlowBackedProcess(process: Process): boolean {
  return Boolean(getFlow(process.template_key));
}

export { listFlows };

export async function listWorkItems(processId: string): Promise<WorkItem[]> {
  const rows = await sql<WorkItem>(
    `select * from work_items where process_id = $1 order by updated_at desc`,
    [processId],
  );
  return rows.map(normalizeWorkItem);
}

export async function getWorkItem(itemId: string): Promise<WorkItem | null> {
  const row = (
    await sql<WorkItem>(`select * from work_items where id = $1`, [itemId])
  )[0];
  return row ? normalizeWorkItem(row) : null;
}

export async function createWorkItem(input: {
  processId: string;
  stageId: string;
  title: string;
  body: string;
  createdBy: string;
  inputs?: Record<string, string>;
}): Promise<WorkItem> {
  const id = createId("wit");
  const inputs = input.inputs ?? {};
  await sql(
    `insert into work_items (
       id, process_id, stage_id, title, body, inputs, created_by
     ) values ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
    [
      id,
      input.processId,
      input.stageId,
      input.title.trim(),
      input.body.trim(),
      JSON.stringify(inputs),
      input.createdBy,
    ],
  );
  return (await getWorkItem(id))!;
}

export async function moveWorkItem(
  itemId: string,
  stageId: string,
): Promise<WorkItem> {
  await sql(
    `update work_items set stage_id = $1, updated_at = now() where id = $2`,
    [stageId, itemId],
  );
  return (await getWorkItem(itemId))!;
}

export async function updateWorkItem(input: {
  itemId: string;
  title: string;
  body: string;
}): Promise<WorkItem> {
  await sql(
    `update work_items set title = $1, body = $2, updated_at = now() where id = $3`,
    [input.title.trim(), input.body.trim(), input.itemId],
  );
  return (await getWorkItem(input.itemId))!;
}

export async function listMessages(input: {
  workItemId?: string;
  processId?: string;
  organizationId?: string;
}): Promise<Message[]> {
  if (input.workItemId) {
    return sql<Message>(
      `select * from messages where work_item_id = $1 order by created_at asc`,
      [input.workItemId],
    );
  }
  if (input.processId) {
    return sql<Message>(
      `select * from messages where process_id = $1 and work_item_id is null order by created_at asc`,
      [input.processId],
    );
  }
  if (input.organizationId) {
    return sql<Message>(
      `select * from messages
       where organization_id = $1
         and process_id is null
         and work_item_id is null
       order by created_at asc`,
      [input.organizationId],
    );
  }
  return [];
}

export async function addMessage(input: {
  organizationId?: string | null;
  processId?: string | null;
  workItemId?: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  authorSub?: string | null;
  authorName?: string;
}): Promise<Message> {
  const id = createId("msg");
  await sql(
    `insert into messages (
       id, organization_id, process_id, work_item_id, role, content, author_sub, author_name
     ) values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      input.organizationId ?? null,
      input.processId ?? null,
      input.workItemId ?? null,
      input.role,
      input.content,
      input.authorSub ?? null,
      input.authorName ?? "",
    ],
  );
  return (
    await sql<Message>(`select * from messages where id = $1`, [id])
  )[0];
}

export async function listWorkspaceAttention(
  organizationId: string,
  limit = 24,
): Promise<WorkspaceAttentionItem[]> {
  return sql<WorkspaceAttentionItem>(
    `select
       wi.id,
       wi.title,
       wi.status,
       s.name as stage_name,
       coalesce(s.stage_type, 'legacy') as stage_type,
       p.id as process_id,
       p.name as process_name,
       coalesce(p.template_key, '') as template_key,
       pr.id as product_id,
       pr.name as product_name,
       wi.updated_at
     from work_items wi
     join stages s on s.id = wi.stage_id
     join processes p on p.id = wi.process_id
     left join products pr on pr.id = p.product_id
     where p.organization_id = $1
       and wi.status <> 'done'
     order by
       case
         when coalesce(s.stage_type, 'legacy') in ('human', 'legacy') then 0
         when s.stage_type = 'agent' then 1
         else 2
       end,
       wi.updated_at desc
     limit $2`,
    [organizationId, limit],
  );
}

export async function listOrganizationWorkItems(
  organizationId: string,
  limit = 100,
): Promise<OrganizationWorkItem[]> {
  const rows = await sql<OrganizationWorkItem & { inputs: unknown }>(
    `select
       wi.id,
       wi.title,
       wi.status,
       wi.inputs,
       s.name as stage_name,
       coalesce(s.stage_type, 'legacy') as stage_type,
       p.id as process_id,
       p.name as process_name,
       coalesce(p.template_key, '') as template_key,
       pr.id as product_id,
       pr.name as product_name,
       wi.updated_at
     from work_items wi
     join stages s on s.id = wi.stage_id
     join processes p on p.id = wi.process_id
     left join products pr on pr.id = p.product_id
     where p.organization_id = $1
       and wi.status <> 'done'
     order by
       case
         when coalesce(s.stage_type, 'legacy') in ('human', 'legacy') then 0
         when s.stage_type = 'agent' then 1
         else 2
       end,
       wi.updated_at desc
     limit $2`,
    [organizationId, limit],
  );
  return rows.map((row) => ({
    ...row,
    inputs: parseWorkItemInputs(row.inputs),
  }));
}

export async function ensureOrgProcess(input: {
  organizationId: string;
  templateKey: string;
  createdBy: string;
}): Promise<Process> {
  const flow = getFlow(input.templateKey);
  if (!flow) throw new Error("Unknown template");

  const existing = (
    await sql<Process>(
      `select * from processes
       where organization_id = $1
         and template_key = $2
         and product_id is null
       limit 1`,
      [input.organizationId, input.templateKey],
    )
  )[0];
  if (existing) return existing;

  return addProcessFromFlow({
    productId: null,
    organizationId: input.organizationId,
    flow,
    createdBy: input.createdBy,
  });
}

export async function buildWorkspaceBrief(organizationId: string): Promise<{
  productCount: number;
  products: { id: string; name: string; description: string }[];
  attention: WorkspaceAttentionItem[];
  needsYou: number;
  agentsWorking: number;
}> {
  const [products, attention] = await Promise.all([
    listProducts(organizationId),
    listWorkspaceAttention(organizationId),
  ]);
  const needsYou = attention.filter(
    (item) => item.stage_type === "human" || item.stage_type === "legacy",
  ).length;
  const agentsWorking = attention.filter((item) => {
    if (item.stage_type === "agent") return true;
    if (item.stage_type !== "script") return false;
    const name = (item.stage_name || "").toLowerCase();
    return (
      name === "build" ||
      name === "validate" ||
      name.includes("cursor") ||
      name.includes("check")
    );
  }).length;
  return {
    productCount: products.length,
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
    })),
    attention,
    needsYou,
    agentsWorking,
  };
}

export async function assertOrgAccess(
  organizationId: string,
  userSub: string,
): Promise<boolean> {
  const rows = await sql<{ id: string }>(
    `select id from memberships where organization_id = $1 and user_sub = $2 limit 1`,
    [organizationId, userSub],
  );
  return Boolean(rows[0]);
}

export async function assertProductAccess(
  productId: string,
  userSub: string,
): Promise<Product | null> {
  const product = await getProduct(productId);
  if (!product) return null;
  const ok = await assertOrgAccess(product.organization_id, userSub);
  return ok ? product : null;
}

export async function assertProcessAccess(
  processId: string,
  userSub: string,
): Promise<Process | null> {
  const process = await getProcess(processId);
  if (!process) return null;
  if (process.organization_id) {
    const ok = await assertOrgAccess(process.organization_id, userSub);
    return ok ? process : null;
  }
  if (process.product_id) {
    const product = await assertProductAccess(process.product_id, userSub);
    return product ? process : null;
  }
  return null;
}

export { workItemHref } from "@/lib/work-links";

export { PROCESS_TEMPLATES };
