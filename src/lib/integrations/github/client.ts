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
  /** Marker file content committed onto the head branch before opening the PR. */
  markerPath?: string;
  markerContent?: string;
};

type GithubApiError = {
  message?: string;
  documentation_url?: string;
};

function githubToken(): string | null {
  const token =
    process.env.GITHUB_TOKEN?.trim() ||
    process.env.GH_TOKEN?.trim() ||
    process.env.GITHUB_PAT?.trim() ||
    "";
  return token || null;
}

export function githubAuthConfigured(): boolean {
  return Boolean(githubToken());
}

function dryRunEnabled(): boolean {
  const flag = process.env.CONSOL_GITHUB_DRY_RUN?.trim();
  if (flag === "1" || flag?.toLowerCase() === "true") return true;
  if (flag === "0" || flag?.toLowerCase() === "false") return false;
  return !githubAuthConfigured();
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
  const { token, owner, repo, base, head, markerPath, markerContent, commitMessage } =
    input;
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
    // Fall back to the repo default branch tip via commits API.
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

  // Create or update the head ref.
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
 * Without GITHUB_TOKEN (or with CONSOL_GITHUB_DRY_RUN=1), returns a dry-run result.
 */
export async function createGithubPullRequest(
  input: CreateGithubPullRequestInput,
): Promise<GithubPullRequest> {
  const owner = input.owner.trim();
  const repo = input.repo.trim();
  const base = input.base.trim() || "main";
  const head = input.head.trim();
  const draft = input.draft !== false;

  if (!owner || !repo || !head) {
    throw new Error("GitHub owner, repo, and head branch are required");
  }

  if (dryRunEnabled()) {
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

  const token = githubToken();
  if (!token) {
    throw new Error("GITHUB_TOKEN is not configured");
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
