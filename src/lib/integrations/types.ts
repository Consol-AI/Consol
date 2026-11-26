export type IntegrationProvider = "github";

export type GithubIntegrationConfig = {
  owner: string;
  repo: string;
  /** Base branch for PRs (default: main). */
  baseBranch: string;
  /** Optional prefix for head branches, e.g. consol/. */
  headBranchPrefix: string;
};

export type WorkItemExternalLink = {
  id: string;
  work_item_id: string;
  provider: string;
  link_type: string;
  external_id: string;
  url: string;
  title: string;
  metadata: Record<string, unknown> | string;
  created_by: string;
  created_at: string;
};
