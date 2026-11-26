import { sql } from "@/lib/db";
import { createId } from "@/lib/id";
import type { WorkItemExternalLink } from "@/lib/integrations/types";

export type {
  GithubIntegrationConfig,
  WorkItemExternalLink,
} from "@/lib/integrations/types";

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
