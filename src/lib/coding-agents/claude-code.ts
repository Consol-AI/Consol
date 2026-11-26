import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { claudeCliPath } from "@/lib/models/claude-cli";
import type {
  CodingAgentProvider,
  CodingAgentRepo,
  CodingAgentRunState,
} from "@/lib/coding-agents/types";

/**
 * Claude Code running locally (headless `claude -p`) with the CLI's own
 * login. Each run gets a git worktree of a Consol-managed clone under
 * .data/repos; a detached runner (scripts/local-agent-runner.mjs) lets the
 * agent edit, then commits, pushes with the gh login, and opens the PR.
 */

const exec = promisify(execFile);

const DEFAULT_ALLOWED_TOOLS = [
  "Read",
  "Edit",
  "Write",
  "Glob",
  "Grep",
  "Bash(git status:*)",
  "Bash(git diff:*)",
  "Bash(git log:*)",
  "Bash(npm ci:*)",
  "Bash(npm install:*)",
  "Bash(npm run lint:*)",
  "Bash(npm test:*)",
  "Bash(npx tsc:*)",
];

function dataDir(...parts: string[]): string {
  return path.join(process.cwd(), ".data", ...parts);
}

function runDirFor(runId: string): string {
  return dataDir("agent-runs", runId);
}

async function git(args: string[], cwd?: string): Promise<string> {
  const { stdout } = await exec("git", args, { cwd, timeout: 300_000 });
  return stdout.trim();
}

/** A Consol-managed clone (never the user's own working checkout). */
async function ensureClone(repo: CodingAgentRepo): Promise<string> {
  const dir = dataDir("repos", repo.owner, repo.repo);
  if (!existsSync(path.join(dir, ".git"))) {
    await mkdir(path.dirname(dir), { recursive: true });
    await exec("gh", ["repo", "clone", `${repo.owner}/${repo.repo}`, dir], {
      timeout: 600_000,
    });
  }
  await git(
    [
      "-c",
      "credential.helper=",
      "-c",
      "credential.helper=!gh auth git-credential",
      "fetch",
      "origin",
      repo.baseBranch,
    ],
    dir,
  );
  return dir;
}

async function commitIdentity(): Promise<{ email: string }> {
  try {
    return { email: await git(["config", "--get", "user.email"], process.cwd()) };
  } catch {
    return { email: "consol@users.noreply.github.com" };
  }
}

function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "change"
  );
}

function pidAlive(pid: unknown): boolean {
  if (typeof pid !== "number") return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export const claudeCodeAgent: CodingAgentProvider = {
  key: "claude-code",
  name: "Claude Code",
  async launch({ workItemId, prompt, title, repo }) {
    const bin = claudeCliPath();
    if (!bin) throw new Error("claude CLI not found on PATH");

    const runId = `local-${randomUUID().slice(0, 8)}`;
    const runDir = runDirFor(runId);
    await mkdir(runDir, { recursive: true });

    const repoDir = await ensureClone(repo);
    const branch = `consol/${slug(title)}-${runId.slice(-8)}`;
    const worktree = path.join(runDir, "worktree");
    await git(
      ["worktree", "add", "-b", branch, worktree, `origin/${repo.baseBranch}`],
      repoDir,
    );

    const allowedTools =
      process.env.CONSOL_AGENT_ALLOWED_TOOLS?.split(",")
        .map((t) => t.trim())
        .filter(Boolean) ?? DEFAULT_ALLOWED_TOOLS;

    await writeFile(
      path.join(runDir, "config.json"),
      JSON.stringify(
        {
          agentName: "Claude Code",
          bin,
          model: process.env.CONSOL_CODING_AGENT_MODEL?.trim() || null,
          allowedTools,
          prompt,
          title,
          workItemId,
          owner: repo.owner,
          repo: repo.repo,
          baseBranch: repo.baseBranch,
          branch,
          repoDir,
          worktree,
          commitEmail: (await commitIdentity()).email,
        },
        null,
        2,
      ),
    );

    const runner = path.join(process.cwd(), "scripts", "local-agent-runner.mjs");
    const child = spawn(process.execPath, [runner, runDir], {
      cwd: repoDir,
      detached: true,
      stdio: "ignore",
      env: process.env,
    });
    child.unref();
    await writeFile(
      path.join(runDir, "status.json"),
      JSON.stringify({ status: "RUNNING", pid: child.pid, text: "Starting…" }),
    );

    return {
      externalAgentId: runId,
      externalRunId: runId,
      agentUrl: path.join(runDir, "agent.log"),
      status: "RUNNING",
      prUrl: null,
      branch,
      text: `Claude Code started locally on ${branch}.`,
      dryRun: false,
    };
  },
  async poll({ externalRunId }): Promise<CodingAgentRunState> {
    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(
        await readFile(path.join(runDirFor(externalRunId), "status.json"), "utf8"),
      ) as Record<string, unknown>;
    } catch {
      return { status: "ERROR", prUrl: null, branch: null, text: "Run status missing." };
    }
    let status = String(raw.status ?? "RUNNING");
    let text = typeof raw.text === "string" ? raw.text : null;
    if (status === "RUNNING" && !pidAlive(raw.pid)) {
      status = "ERROR";
      text = "The local agent process exited without reporting a result. See agent.log.";
    }
    return {
      status,
      prUrl: typeof raw.prUrl === "string" ? raw.prUrl : null,
      branch: typeof raw.branch === "string" ? raw.branch : null,
      text,
    };
  },
  async stop({ externalRunId }) {
    const statusPath = path.join(runDirFor(externalRunId), "status.json");
    let raw: Record<string, unknown> = {};
    try {
      raw = JSON.parse(await readFile(statusPath, "utf8")) as Record<string, unknown>;
    } catch {
      return { dryRun: false };
    }
    if (pidAlive(raw.pid)) {
      // The runner is spawned detached, so it leads its own process group:
      // signal the group to take the claude CLI child down with it.
      try {
        process.kill(-(raw.pid as number), "SIGTERM");
      } catch {
        process.kill(raw.pid as number, "SIGTERM");
      }
    }
    await writeFile(
      statusPath,
      JSON.stringify({ ...raw, status: "CANCELLED", text: "Stopped from Consol." }),
    );
    return { dryRun: false };
  },
  isTerminal: (status) =>
    status === "FINISHED" || status === "ERROR" || status === "CANCELLED",
  isSuccessful: (status) => status === "FINISHED",
};
