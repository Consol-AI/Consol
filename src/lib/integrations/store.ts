import { sql } from "@/lib/db";
import { createId } from "@/lib/id";
import {
  parseGithubConfig,
  type GithubIntegrationConfig,
  type ProductIntegration,
  type WorkItemExternalLink,
} from "@/lib/integrations/types";

export type {
  GithubIntegrationConfig,
  ProductIntegration,
  WorkItemExternalLink,
} from "@/lib/integrations/types";
export {
  parseGithubConfig,
  parseIntegrationConfig,
} from "@/lib/integrations/types";

export async function listProductIntegrations(
  productId: string,
): Promise<ProductIntegration[]> {
  return sql<ProductIntegration>(
    `select * from product_integrations
     where product_id = $1
     order by provider asc`,
    [productId],
  );
}

export async function getProductIntegration(
  productId: string,
  provider: string,
): Promise<ProductIntegration | null> {
  return (
    (
      await sql<ProductIntegration>(
        `select * from product_integrations
         where product_id = $1 and provider = $2
         limit 1`,
        [productId, provider],
      )
    )[0] ?? null
  );
}

export async function upsertGithubIntegration(input: {
  productId: string;
  owner: string;
  repo: string;
  baseBranch?: string;
  headBranchPrefix?: string;
  createdBy: string;
}): Promise<ProductIntegration> {
  const owner = input.owner.trim();
  const repo = input.repo.trim();
  if (!owner || !repo) {
    throw new Error("GitHub owner and repository are required");
  }

  const config: GithubIntegrationConfig = {
    owner,
    repo,
    baseBranch: (input.baseBranch ?? "main").trim() || "main",
    headBranchPrefix: (input.headBranchPrefix ?? "consol/").trim() || "consol/",
  };

  const existing = await getProductIntegration(input.productId, "github");
  if (existing) {
    await sql(
      `update product_integrations
       set config = $1::jsonb,
           status = 'configured',
           updated_at = now()
       where id = $2`,
      [JSON.stringify(config), existing.id],
    );
    return (await getProductIntegration(input.productId, "github"))!;
  }

  const id = createId("int");
  await sql(
    `insert into product_integrations (
       id, product_id, provider, status, config, created_by
     ) values ($1, $2, 'github', 'configured', $3::jsonb, $4)`,
    [id, input.productId, JSON.stringify(config), input.createdBy],
  );
  return (await getProductIntegration(input.productId, "github"))!;
}

export async function clearProductIntegration(
  productId: string,
  provider: string,
): Promise<void> {
  await sql(
    `delete from product_integrations where product_id = $1 and provider = $2`,
    [productId, provider],
  );
}

export async function listWorkItemExternalLinks(
  workItemId: string,
): Promise<WorkItemExternalLink[]> {
  return sql<WorkItemExternalLink>(
    `select * from work_item_external_links
     where work_item_id = $1
     order by created_at desc`,
    [workItemId],
  );
}

/** Most recent GitHub pull request link per work item, in one query. */
export async function listLatestPullRequestLinks(
  workItemIds: string[],
): Promise<WorkItemExternalLink[]> {
  if (workItemIds.length === 0) return [];
  return sql<WorkItemExternalLink>(
    `select distinct on (work_item_id) * from work_item_external_links
     where work_item_id = any($1::text[])
       and provider = 'github' and link_type = 'pull_request'
     order by work_item_id, created_at desc`,
    [workItemIds],
  );
}

export async function addWorkItemExternalLink(input: {
  workItemId: string;
  provider: string;
  linkType: string;
  externalId?: string;
  url: string;
  title?: string;
  metadata?: Record<string, unknown>;
  createdBy: string;
}): Promise<WorkItemExternalLink> {
  const id = createId("xln");
  await sql(
    `insert into work_item_external_links (
       id, work_item_id, provider, link_type, external_id, url, title, metadata, created_by
     ) values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9)`,
    [
      id,
      input.workItemId,
      input.provider,
      input.linkType,
      input.externalId ?? "",
      input.url,
      input.title ?? "",
      JSON.stringify(input.metadata ?? {}),
      input.createdBy,
    ],
  );
  return (
    await sql<WorkItemExternalLink>(
      `select * from work_item_external_links where id = $1`,
      [id],
    )
  )[0];
}

export async function getGithubConfigForProduct(
  productId: string,
): Promise<GithubIntegrationConfig | null> {
  const row = await getProductIntegration(productId, "github");
  if (!row || row.status === "disabled") return null;
  return parseGithubConfig(row.config);
}
