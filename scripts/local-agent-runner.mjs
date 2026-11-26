#!/usr/bin/env node
/**
 * Detached runner for local coding agents (Claude Code CLI).
 *
 *   node scripts/local-agent-runner.mjs <runDir>
 *
 * Reads <runDir>/config.json, runs the agent headless in the prepared git
 * worktree, then commits, pushes (via the gh credential helper), and opens a
 * PR with `gh pr create`. Progress goes to <runDir>/agent.log; the outcome to
 * <runDir>/status.json, which the Consol worker polls.
 */
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const runDir = process.argv[2];
if (!runDir) {
  console.error("usage: local-agent-runner.mjs <runDir>");
  process.exit(2);
}

const config = JSON.parse(await readFile(path.join(runDir, "config.json"), "utf8"));
const log = createWriteStream(path.join(runDir, "agent.log"), { flags: "a" });

async function writeStatus(status) {
  const file = path.join(runDir, "status.json");
  const tmp = `${file}.tmp`;
  await writeFile(
    tmp,
    JSON.stringify({ pid: process.pid, updatedAt: new Date().toISOString(), ...status }, null, 2),
  );
  await rename(tmp, file);
}

function run(cmd, args, { cwd = config.worktree, input, capture = false } = {}) {
  return new Promise((resolve, reject) => {
    log.write(`\n$ ${cmd} ${args.map((a) => (a.length > 80 ? `${a.slice(0, 77)}...` : a)).join(" ")}\n`);
    const child = spawn(cmd, args, { cwd, stdio: ["pipe", "pipe", "pipe"], env: process.env });
    let out = "";
    child.stdout.on("data", (d) => {
      if (capture) out += d.toString();
      log.write(d);
    });
    child.stderr.on("data", (d) => log.write(d));
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve(out.trim()) : reject(new Error(`${cmd} exited with ${code}`)),
    );
    child.stdin.end(input ?? "");
  });
}

async function main() {
  await writeStatus({ status: "RUNNING", text: `${config.agentName} is working…` });

  // 1. Let the agent edit the worktree. It may only use the allowlisted tools.
  const agentArgs = [
    "-p",
    "--permission-mode",
    "dontAsk",
    "--allowedTools",
    ...config.allowedTools,
    "--append-system-prompt",
    [
      "You are running unattended inside a git worktree for a Consol work item. Make the change, run the project's checks if you can, and leave your changes uncommitted in the working tree — Consol commits, pushes, and opens the pull request. End with a short summary of what you changed and how you verified it.",
      `Shell access is limited to these patterns: ${config.allowedTools.filter((t) => t.startsWith("Bash(")).join(", ") || "none"}. Run each command on its own from the worktree root — no cd, &&, pipes, or redirects — or it will be denied.`,
    ].join("\n\n"),
    "--output-format",
    "text",
    "--no-session-persistence",
  ];
  if (config.model) agentArgs.push("--model", config.model);
  const summary = await run(config.bin, agentArgs, { input: config.prompt, capture: true });

  // 2. Commit whatever the agent changed.
  const changes = await run("git", ["status", "--porcelain"], { capture: true });
  if (!changes) {
    await writeStatus({ status: "ERROR", text: `${config.agentName} made no changes.\n\n${summary}` });
    return;
  }
  await run("git", ["add", "-A"]);
  await run("git", [
    "-c", "user.name=Consol",
    "-c", `user.email=${config.commitEmail}`,
    "commit", "-m", `${config.title}\n\nConsol work item ${config.workItemId}`,
  ]);

  // 3. Push with the gh login and open the PR.
  await run("git", [
    "-c", "credential.helper=",
    "-c", "credential.helper=!gh auth git-credential",
    "push", "-u", "origin", `HEAD:refs/heads/${config.branch}`,
  ]);
  const body = [
    `Consol work item \`${config.workItemId}\`, built by ${config.agentName} (local CLI).`,
    "",
    "## Agent summary",
    "",
    summary || "_No summary._",
  ].join("\n");
  const prUrl = await run(
    "gh",
    [
      "pr", "create",
      "--repo", `${config.owner}/${config.repo}`,
      "--base", config.baseBranch,
      "--head", config.branch,
      "--title", config.title,
      "--body-file", "-",
    ],
    { input: body, capture: true },
  );

  await writeStatus({
    status: "FINISHED",
    prUrl: prUrl.split("\n").pop()?.trim() || null,
    branch: config.branch,
    text: summary.slice(0, 4000),
  });

  // 4. Drop the worktree; the branch lives on in the PR.
  await run("git", ["worktree", "remove", "--force", config.worktree], {
    cwd: config.repoDir,
  }).catch(() => {});
}

main()
  .catch(async (error) => {
    log.write(`\nERROR: ${error?.stack || error}\n`);
    await writeStatus({ status: "ERROR", text: String(error?.message || error) });
  })
  .finally(() => log.end());
