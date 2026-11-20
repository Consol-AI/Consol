import { sql } from "@/lib/db";
import { createId } from "@/lib/id";
import { getTemplate, PROCESS_TEMPLATES } from "@/lib/templates";

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
  product_id: string;
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
};

export type WorkItem = {
  id: string;
  process_id: string;
  stage_id: string;
  title: string;
  body: string;
  status: string;
  assignee_sub: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  process_id: string | null;
  work_item_id: string | null;
  role: string;
  content: string;
  author_sub: string | null;
  author_name: string;
  created_at: string;
};

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "workspace"
  );
}

export async function ensureWorkspace(viewer: {
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
  const template = getTemplate(input.templateKey);
  if (!template) throw new Error("Unknown template");

  const processId = createId("prc");
  await sql(
    `insert into processes (id, product_id, name, domain, template_key, created_by)
     values ($1, $2, $3, $4, $5, $6)`,
    [
      processId,
      input.productId,
      template.name,
      template.domain,
      template.key,
      input.createdBy,
    ],
  );

  for (const [index, stage] of template.stages.entries()) {
    await sql(
      `insert into stages (id, process_id, name, position, description)
       values ($1, $2, $3, $4, $5)`,
      [createId("stg"), processId, stage.name, index, stage.description],
    );
  }

  return (await getProcess(processId))!;
}

export async function listStages(processId: string): Promise<Stage[]> {
  return sql<Stage>(
    `select * from stages where process_id = $1 order by position asc`,
    [processId],
  );
}

export async function listWorkItems(processId: string): Promise<WorkItem[]> {
  return sql<WorkItem>(
    `select * from work_items where process_id = $1 order by updated_at desc`,
    [processId],
  );
}

export async function getWorkItem(itemId: string): Promise<WorkItem | null> {
  return (
    (
      await sql<WorkItem>(`select * from work_items where id = $1`, [itemId])
    )[0] ?? null
  );
}

export async function createWorkItem(input: {
  processId: string;
  stageId: string;
  title: string;
  body: string;
  createdBy: string;
}): Promise<WorkItem> {
  const id = createId("wit");
  await sql(
    `insert into work_items (id, process_id, stage_id, title, body, created_by)
     values ($1, $2, $3, $4, $5, $6)`,
    [
      id,
      input.processId,
      input.stageId,
      input.title.trim(),
      input.body.trim(),
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
  return [];
}

export async function addMessage(input: {
  processId?: string | null;
  workItemId?: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  authorSub?: string | null;
  authorName?: string;
}): Promise<Message> {
  const id = createId("msg");
  await sql(
    `insert into messages (id, process_id, work_item_id, role, content, author_sub, author_name)
     values ($1, $2, $3, $4, $5, $6, $7)`,
    [
      id,
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

export { PROCESS_TEMPLATES };
