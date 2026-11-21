export type IntegrationProvider = "github";

export type IntegrationStatus = "configured" | "disabled";

export type GithubIntegrationConfig = {
  owner: string;
  repo: string;
  /** Base branch for PRs (default: main). */
  baseBranch: string;
  /** Optional prefix for head branches, e.g. consol/. */
  headBranchPrefix: string;
};

export type ProductIntegration = {
  id: string;
  product_id: string;
  provider: IntegrationProvider | string;
  status: IntegrationStatus | string;
  config: Record<string, unknown> | string;
  created_by: string;
  created_at: string;
  updated_at: string;
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

export function parseIntegrationConfig(
  config: ProductIntegration["config"],
): Record<string, unknown> {
  if (typeof config === "string") {
    try {
      const parsed = JSON.parse(config) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return config && typeof config === "object" ? config : {};
}

export function parseGithubConfig(
  config: ProductIntegration["config"],
): GithubIntegrationConfig | null {
  const raw = parseIntegrationConfig(config);
  const owner = typeof raw.owner === "string" ? raw.owner.trim() : "";
  const repo = typeof raw.repo === "string" ? raw.repo.trim() : "";
  if (!owner || !repo) return null;
  const baseBranch =
    typeof raw.baseBranch === "string" && raw.baseBranch.trim()
      ? raw.baseBranch.trim()
      : "main";
  const headBranchPrefix =
    typeof raw.headBranchPrefix === "string" && raw.headBranchPrefix.trim()
      ? raw.headBranchPrefix.trim()
      : "consol/";
  return { owner, repo, baseBranch, headBranchPrefix };
}
