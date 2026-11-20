#!/usr/bin/env node
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const slug = process.argv[2];

if (!slug) {
  console.error("Usage: npm run agents:serve -- <slug>");
  process.exit(1);
}

const registryPath = path.join(root, "data", "teammates.json");
const agentDir = path.join(root, "agents", slug);

let port = 44001;
try {
  const raw = await readFile(registryPath, "utf8");
  const teammates = JSON.parse(raw);
  const match = Array.isArray(teammates)
    ? teammates.find((t) => t.slug === slug)
    : null;
  if (match?.port) port = match.port;
} catch {
  // fall through with default port
}

const child = spawn(
  "npx",
  [
    "--yes",
    "@grok/agent-sdk@0.7.0",
    "serve",
    "--dir",
    agentDir,
    "--mode",
    "single",
    "--dev",
    "--port",
    String(port),
  ],
  {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  },
);

child.on("exit", (code) => process.exit(code ?? 0));
