import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getOrganizationAccessToken } from "@/lib/integrations/connections";
import type { GithubIntegrationConfig } from "@/lib/integrations/types";

/**
 * Local-first GitHub workarounds: the repo comes from env or the local git
 * remote, and the token from env or the `gh` CLI login. A workspace OAuth
 * connection still wins when one exists.
 */

const exec = promisify(execFile);

async function run(cmd: string, args: string[]): Promise<string | null> {
  try {
    const { stdout } = await exec(cmd, args, {
      cwd: process.cwd(),
      timeout: 5_000,
    });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

/** Parse `owner/repo` out of "owner/repo" or any GitHub remote URL. */
export function parseOwnerRepo(
  value: string | null | undefined,
): { owner: string; repo: string } | null {
  const text = value?.trim();
  if (!text) return null;
  const match =
    text.match(/github\.com[:/]+([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/i) ??
    text.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

export type ResolvedRepo = GithubIntegrationConfig & {
  source: "input" | "env" | "git";
};

let gitRepoCache: Promise<ResolvedRepo | null> | null = null;

async function repoFromGit(): Promise<ResolvedRepo | null> {
  gitRepoCache ??= (async () => {
    const remote = await run("git", ["remote", "get-url", "origin"]);
    const parsed = parseOwnerRepo(remote);
    if (!parsed) return null;
    const head = await run("git", [
      "symbolic-ref",
      "--short",
      "refs/remotes/origin/HEAD",
    ]);
    return {
      ...parsed,
      baseBranch: head?.replace(/^origin\//, "") || "main",
      headBranchPrefix: "consol/",
      source: "git" as const,
    };
  })();
  return gitRepoCache;
}

/**
 * Repo for a work item: its `repo` input, else CONSOL_GITHUB_REPO, else the
 * local `git remote get-url origin`.
 */
export async function resolveRepo(
  inputs?: Record<string, string> | null,
): Promise<ResolvedRepo | null> {
  const envBase = process.env.CONSOL_GITHUB_BASE_BRANCH?.trim();
  const fromGit = await repoFromGit();
  const baseFor = (owner: string, repo: string) =>
    envBase ||
    (fromGit && fromGit.owner === owner && fromGit.repo === repo
      ? fromGit.baseBranch
      : "main");

  const fromInput = parseOwnerRepo(inputs?.repo);
  if (fromInput) {
    return {
      ...fromInput,
      baseBranch: baseFor(fromInput.owner, fromInput.repo),
      headBranchPrefix: "consol/",
      source: "input",
    };
  }

  const fromEnv = parseOwnerRepo(process.env.CONSOL_GITHUB_REPO);
  if (fromEnv) {
    return {
      ...fromEnv,
      baseBranch: baseFor(fromEnv.owner, fromEnv.repo),
      headBranchPrefix: "consol/",
      source: "env",
    };
  }

  if (!fromGit) return null;
  return envBase ? { ...fromGit, baseBranch: envBase } : fromGit;
}

export type GithubTokenSource = "oauth" | "env" | "gh";

let ghTokenCache: Promise<string | null> | null = null;

function ghToken(): Promise<string | null> {
  ghTokenCache ??= run("gh", ["auth", "token"]).then((token) => {
    // Retry on the next call if gh wasn't logged in yet.
    if (!token) ghTokenCache = null;
    return token;
  });
  return ghTokenCache;
}

/** GitHub token: workspace OAuth, else GITHUB_TOKEN/GH_TOKEN, else `gh auth token`. */
export async function getGithubTokenWithSource(
  organizationId: string | null | undefined,
): Promise<{ token: string; source: GithubTokenSource } | null> {
  if (organizationId) {
    const oauth = await getOrganizationAccessToken(organizationId, "github");
    if (oauth?.trim()) return { token: oauth.trim(), source: "oauth" };
  }
  const env =
    process.env.GITHUB_TOKEN?.trim() || process.env.GH_TOKEN?.trim();
  if (env) return { token: env, source: "env" };
  const gh = await ghToken();
  if (gh) return { token: gh, source: "gh" };
  return null;
}

export async function getGithubToken(
  organizationId: string | null | undefined,
): Promise<string | null> {
  return (await getGithubTokenWithSource(organizationId))?.token ?? null;
}
