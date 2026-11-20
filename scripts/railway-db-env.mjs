#!/usr/bin/env node
/**
 * Pull the consol Railway Postgres public URL into .env.local for local testing.
 *
 * Prerequisites:
 *   - railway CLI installed and logged in
 *   - this repo linked to the consol project (or pass --project / --environment / --service)
 *
 * Usage:
 *   npm run db:railway-env
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const PROJECT = process.env.RAILWAY_PROJECT_ID || "428e87b0-92c3-4688-9320-0c95a04e9372";
const ENVIRONMENT =
  process.env.RAILWAY_ENVIRONMENT_ID || "9c2c0176-ba11-41f4-8fb8-09071ad77222";
const SERVICE =
  process.env.RAILWAY_SERVICE_ID || "d7bc91ad-8d03-4116-a7be-7743c51a48a3";

function railwayJson(args) {
  const result = spawnSync(
    "railway",
    [...args, "--json"],
    {
      encoding: "utf8",
      env: process.env,
    },
  );
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || "").trim();
    throw new Error(err || `railway ${args[0]} failed`);
  }
  return JSON.parse(result.stdout);
}

const vars = railwayJson([
  "variables",
  "--project",
  PROJECT,
  "--environment",
  ENVIRONMENT,
  "--service",
  SERVICE,
]);

const host = vars.RAILWAY_TCP_PROXY_DOMAIN;
const port = vars.RAILWAY_TCP_PROXY_PORT;
const user = vars.POSTGRES_USER || vars.PGUSER;
const password = vars.POSTGRES_PASSWORD || vars.PGPASSWORD;
const db = vars.POSTGRES_DB || vars.PGDATABASE;

if (!host || !port || !user || !password || !db) {
  console.error(
    "Missing Railway TCP proxy or Postgres credentials. Ensure the Postgres service has a public TCP proxy on 5432.",
  );
  process.exit(1);
}

const url = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${db}`;

const body = [
  "# Railway Postgres (consol) — do not commit",
  `# Project: consol (${PROJECT})`,
  `# Service: Postgres (${SERVICE})`,
  "DATABASE_SSL=0",
  `DATABASE_URL=${url}`,
  `DATABASE_URL_UNPOOLED=${url}`,
  "",
].join("\n");

writeFileSync(".env.local", body, { mode: 0o600 });
console.log("Wrote .env.local with Railway public DATABASE_URL");
console.log(`Host=${host} Port=${port} DB=${db} User=${user}`);
console.log("Next: npm run db:migrate && CONSOL_DEMO_AUTH=1 npm run dev");
