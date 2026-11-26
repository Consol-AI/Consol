export type GithubPullRequest = {
  number: number;
  htmlUrl: string;
  title: string;
  draft: boolean;
  head: string;
  base: string;
  dryRun: boolean;
};

export type CreateGithubPullRequestInput = {
  owner: string;
  repo: string;
  title: string;
  body: string;
  head: string;
  base: string;
  draft?: boolean;
  /** OAuth access token for the workspace GitHub connection. */
  accessToken?: string | null;
  /** Marker file content committed onto the head branch before opening the PR. */
  markerPath?: string;
  markerContent?: string;
};

type GithubApiError = {
  message?: string;
  documentation_url?: string;
};

function dryRunForced(): boolean {
  const flag = process.env.CONSOL_GITHUB_DRY_RUN?.trim();
  return flag === "1" || flag?.toLowerCase() === "true";
}

/** @deprecated Prefer workspace OAuth via organization_connections. */
export function githubAuthConfigured(): boolean {
  return Boolean(
    process.env.GITHUB_CLIENT_ID?.trim() &&
      process.env.GITHUB_CLIENT_SECRET?.trim(),
  );
}

async function githubFetch<T>(
  path: string,
  init: RequestInit & { token: string },
): Promise<T> {
  const { token, ...rest } = init;
  const response = await fetch(`https://api.github.com${path}`, {
    ...rest,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(rest.headers ?? {}),
    },
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as GithubApiError;
      if (body.message) detail = body.message;
    } catch {
      // ignore parse errors
    }
    throw new Error(`GitHub API ${response.status}: ${detail}`);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/**
 * Can this token see owner/repo? 404/403 mean no access; other failures
 * (network, rate limit) throw so callers don't mistake them for a denial.
 */
export async function githubRepoVisible(input: {
  owner: string;
  repo: string;
  token: string;
}): Promise<boolean> {
  try {
    await githubFetch(
      `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}`,
      { method: "GET", token: input.token },
    );
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/rate limit/i.test(message)) throw error;
    if (/^GitHub API (403|404):/.test(message)) return false;
    throw error;
  }
}

function slugBranchSegment(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "item"
  );
}

export function githubHeadBranchName(
  prefix: string,
  workItemId: string,
  title: string,
): string {
  const idTail = workItemId.replace(/^wit_/, "").slice(0, 10);
  const titlePart = slugBranchSegment(title).slice(0, 24);
  const safePrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;
  return `${safePrefix}${idTail}-${titlePart}`.replace(/\/+/g, "/");
}

async function ensureBranchWithMarker(input: {
  token: string;
  owner: string;
  repo: string;
  base: string;
  head: string;
  markerPath: string;
  markerContent: string;
  commitMessage: string;
}): Promise<void> {
  const {
    token,
    owner,
    repo,
    base,
    head,
    markerPath,
    markerContent,
    commitMessage,
  } = input;
  const repoPath = `/repos/${owner}/${repo}`;

  type RefResponse = { object: { sha: string } };
  type CommitResponse = {
    sha: string;
    tree: { sha: string };
  };
  type BlobResponse = { sha: string };
  type TreeResponse = { sha: string };

  let baseSha: string;
  try {
    const ref = await githubFetch<RefResponse>(
      `${repoPath}/git/ref/heads/${encodeURIComponent(base)}`,
      { method: "GET", token },
    );
    baseSha = ref.object.sha;
  } catch {
    const commits = await githubFetch<Array<{ sha: string }>>(
      `${repoPath}/commits?sha=${encodeURIComponent(base)}&per_page=1`,
      { method: "GET", token },
    );
    if (!commits[0]?.sha) {
      throw new Error(`Could not resolve base branch "${base}"`);
    }
    baseSha = commits[0].sha;
  }

  const baseCommit = await githubFetch<CommitResponse>(
    `${repoPath}/git/commits/${baseSha}`,
    { method: "GET", token },
  );

  const blob = await githubFetch<BlobResponse>(`${repoPath}/git/blobs`, {
    method: "POST",
    token,
    body: JSON.stringify({
      content: Buffer.from(markerContent, "utf8").toString("base64"),
      encoding: "base64",
    }),
  });

  const tree = await githubFetch<TreeResponse>(`${repoPath}/git/trees`, {
    method: "POST",
    token,
    body: JSON.stringify({
      base_tree: baseCommit.tree.sha,
      tree: [
        {
          path: markerPath.replace(/^\//, ""),
          mode: "100644",
          type: "blob",
          sha: blob.sha,
        },
      ],
    }),
  });

  const commit = await githubFetch<CommitResponse>(`${repoPath}/git/commits`, {
    method: "POST",
    token,
    body: JSON.stringify({
      message: commitMessage,
      tree: tree.sha,
      parents: [baseSha],
    }),
  });

  try {
    await githubFetch(`${repoPath}/git/refs`, {
      method: "POST",
      token,
      body: JSON.stringify({
        ref: `refs/heads/${head}`,
        sha: commit.sha,
      }),
    });
  } catch {
    await githubFetch(
      `${repoPath}/git/refs/heads/${encodeURIComponent(head)}`,
      {
        method: "PATCH",
        token,
        body: JSON.stringify({ sha: commit.sha, force: true }),
      },
    );
  }
}

/**
 * Open a draft pull request for a Consol work item.
 * Uses the workspace OAuth access token. Without one (or with
 * CONSOL_GITHUB_DRY_RUN=1), returns a dry-run result.
 */
export async function createGithubPullRequest(
  input: CreateGithubPullRequestInput,
): Promise<GithubPullRequest> {
  const owner = input.owner.trim();
  const repo = input.repo.trim();
  const base = input.base.trim() || "main";
  const head = input.head.trim();
  const draft = input.draft !== false;
  const token = input.accessToken?.trim() || null;

  if (!owner || !repo || !head) {
    throw new Error("GitHub owner, repo, and head branch are required");
  }

  if (dryRunForced() || !token) {
    const number = Math.floor(Math.random() * 900) + 100;
    return {
      number,
      htmlUrl: `https://github.com/${owner}/${repo}/pull/${number}`,
      title: input.title,
      draft,
      head,
      base,
      dryRun: true,
    };
  }

  const markerPath = input.markerPath ?? ".consol/work-item.md";
  const markerContent =
    input.markerContent ??
    `# ${input.title}\n\nOpened by Consol.\n\n${input.body}\n`;

  await ensureBranchWithMarker({
    token,
    owner,
    repo,
    base,
    head,
    markerPath,
    markerContent,
    commitMessage: `chore(consol): scaffold PR for ${input.title}`,
  });

  type PullResponse = {
    number: number;
    html_url: string;
    title: string;
    draft: boolean;
    head: { ref: string };
    base: { ref: string };
  };

  const pull = await githubFetch<PullResponse>(
    `/repos/${owner}/${repo}/pulls`,
    {
      method: "POST",
      token,
      body: JSON.stringify({
        title: input.title,
        body: input.body,
        head,
        base,
        draft,
      }),
    },
  );

  return {
    number: pull.number,
    htmlUrl: pull.html_url,
    title: pull.title,
    draft: pull.draft,
    head: pull.head.ref,
    base: pull.base.ref,
    dryRun: false,
  };
}

export type GithubPullRequestDetails = {
  number: number;
  htmlUrl: string;
  title: string;
  state: string;
  merged: boolean;
  draft: boolean;
  headSha: string;
  headRef: string;
  baseRef: string;
  dryRun: boolean;
};

export type GithubCheckSummary = {
  state: "success" | "failure" | "pending" | "neutral";
  total: number;
  success: number;
  failure: number;
  pending: number;
  summary: string;
  dryRun: boolean;
};

export type MergeGithubPullRequestResult = {
  merged: boolean;
  message: string;
  sha?: string;
  dryRun: boolean;
};

function parseOwnerRepoFromPrUrl(prUrl: string): {
  owner: string;
  repo: string;
  number: number;
} | null {
  const match = prUrl.match(
    /github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)/i,
  );
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2],
    number: Number(match[3]),
  };
}

export async function getGithubPullRequest(input: {
  owner: string;
  repo: string;
  number: number;
  accessToken?: string | null;
}): Promise<GithubPullRequestDetails> {
  const token = input.accessToken?.trim() || null;
  if (dryRunForced() || !token) {
    return {
      number: input.number,
      htmlUrl: `https://github.com/${input.owner}/${input.repo}/pull/${input.number}`,
      title: `PR #${input.number}`,
      state: "open",
      merged: false,
      draft: false,
      headSha: "dryrun0000000000000000000000000000000000",
      headRef: "cursor/dry-run",
      baseRef: "main",
      dryRun: true,
    };
  }

  type PullResponse = {
    number: number;
    html_url: string;
    title: string;
    state: string;
    merged: boolean;
    draft: boolean;
    head: { sha: string; ref: string };
    base: { ref: string };
  };

  const pull = await githubFetch<PullResponse>(
    `/repos/${input.owner}/${input.repo}/pulls/${input.number}`,
    { method: "GET", token },
  );

  return {
    number: pull.number,
    htmlUrl: pull.html_url,
    title: pull.title,
    state: pull.state,
    merged: pull.merged,
    draft: pull.draft,
    headSha: pull.head.sha,
    headRef: pull.head.ref,
    baseRef: pull.base.ref,
    dryRun: false,
  };
}

export async function getGithubPullRequestFromUrl(input: {
  prUrl: string;
  accessToken?: string | null;
}): Promise<GithubPullRequestDetails | null> {
  const parsed = parseOwnerRepoFromPrUrl(input.prUrl);
  if (!parsed) return null;
  return getGithubPullRequest({
    ...parsed,
    accessToken: input.accessToken,
  });
}

export async function getGithubCheckSummary(input: {
  owner: string;
  repo: string;
  ref: string;
  accessToken?: string | null;
}): Promise<GithubCheckSummary> {
  const token = input.accessToken?.trim() || null;
  if (dryRunForced() || !token || input.ref.startsWith("dryrun")) {
    return {
      state: "success",
      total: 1,
      success: 1,
      failure: 0,
      pending: 0,
      summary: "Dry-run checks: all green.",
      dryRun: true,
    };
  }

  type CheckRunsResponse = {
    total_count: number;
    check_runs: Array<{
      name: string;
      status: string;
      conclusion: string | null;
    }>;
  };

  const checks = await githubFetch<CheckRunsResponse>(
    `/repos/${input.owner}/${input.repo}/commits/${encodeURIComponent(input.ref)}/check-runs?per_page=100`,
    { method: "GET", token },
  );

  let success = 0;
  let failure = 0;
  let pending = 0;
  for (const run of checks.check_runs) {
    if (run.status !== "completed") {
      pending += 1;
      continue;
    }
    const conclusion = (run.conclusion ?? "").toLowerCase();
    if (
      conclusion === "success" ||
      conclusion === "neutral" ||
      conclusion === "skipped"
    ) {
      success += 1;
    } else if (
      conclusion === "failure" ||
      conclusion === "timed_out" ||
      conclusion === "cancelled" ||
      conclusion === "action_required"
    ) {
      failure += 1;
    } else {
      success += 1;
    }
  }

  // No check runs: treat as success so ship gate can proceed on repos without CI.
  if (checks.total_count === 0) {
    return {
      state: "success",
      total: 0,
      success: 0,
      failure: 0,
      pending: 0,
      summary: "No GitHub check runs on this commit — treated as success.",
      dryRun: false,
    };
  }

  const state: GithubCheckSummary["state"] =
    failure > 0 ? "failure" : pending > 0 ? "pending" : "success";

  return {
    state,
    total: checks.total_count,
    success,
    failure,
    pending,
    summary:
      state === "success"
        ? `Checks passed (${success}/${checks.total_count}).`
        : state === "failure"
          ? `Checks failed (${failure} failing, ${pending} pending).`
          : `Checks still running (${pending} pending, ${success} green).`,
    dryRun: false,
  };
}

export async function mergeGithubPullRequest(input: {
  owner: string;
  repo: string;
  number: number;
  accessToken?: string | null;
  mergeMethod?: "merge" | "squash" | "rebase";
  commitTitle?: string;
}): Promise<MergeGithubPullRequestResult> {
  const token = input.accessToken?.trim() || null;
  if (dryRunForced() || !token) {
    return {
      merged: true,
      message: `Dry-run merged PR #${input.number}`,
      sha: "drymerge000000000000000000000000000000000",
      dryRun: true,
    };
  }

  type MergeResponse = {
    merged: boolean;
    message: string;
    sha?: string;
  };

  const result = await githubFetch<MergeResponse>(
    `/repos/${input.owner}/${input.repo}/pulls/${input.number}/merge`,
    {
      method: "PUT",
      token,
      body: JSON.stringify({
        merge_method: input.mergeMethod ?? "squash",
        commit_title: input.commitTitle,
      }),
    },
  );

  return {
    merged: result.merged,
    message: result.message,
    sha: result.sha,
    dryRun: false,
  };
}

export function parseGithubPrUrl(prUrl: string): {
  owner: string;
  repo: string;
  number: number;
} | null {
  return parseOwnerRepoFromPrUrl(prUrl);
}
