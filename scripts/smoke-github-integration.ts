/**
 * Smoke-test GitHub dry-run open-pr against local PGlite.
 * Run: npx tsx scripts/smoke-github-integration.ts
 */
process.env.CONSOL_GITHUB_DRY_RUN = "1";
process.env.CONNECTOR_TOKEN_SECRET = "smoke-test-secret";
delete process.env.DATABASE_URL;
delete process.env.GITHUB_TOKEN;
delete process.env.GH_TOKEN;
delete process.env.GITHUB_PAT;

import { createId } from "../src/lib/id";
import { sql } from "../src/lib/db";
import {
  createGithubPullRequest,
  githubHeadBranchName,
  resolveRepo,
} from "../src/lib/integrations";
import {
  getOrganizationAccessToken,
  getPublicOrganizationConnection,
  upsertOrganizationConnection,
} from "../src/lib/integrations/connections";
import {
  createOauthState,
  parseOauthState,
} from "../src/lib/integrations/github/oauth";
import { runOpenPullRequest } from "../src/lib/flows/scripts/open-pr";
import { createWorkItem, ensureOrgProcess, listStages } from "../src/lib/factory";

async function main() {
  const state = createOauthState({
    orgId: "org_smoke",
    userSub: "user:smoke",
    returnTo: "/app/connectors/github",
  });
  const parsed = parseOauthState(state);
  if (parsed.orgId !== "org_smoke" || parsed.userSub !== "user:smoke") {
    throw new Error(`bad oauth state: ${JSON.stringify(parsed)}`);
  }
  console.log("ok: oauth state round-trip");

  const pull = await createGithubPullRequest({
    owner: "acme",
    repo: "demo",
    title: "Smoke PR",
    body: "From Consol smoke test",
    head: "consol/smoke-test",
    base: "main",
    draft: true,
  });
  if (!pull.dryRun || !pull.htmlUrl.includes("github.com/acme/demo/pull/")) {
    throw new Error(`Unexpected dry-run PR result: ${JSON.stringify(pull)}`);
  }
  console.log("ok: dry-run createGithubPullRequest", pull.htmlUrl);

  const head = githubHeadBranchName(
    "consol/",
    "wit_abcdefghijklmnop",
    "Add feature",
  );
  if (!head.startsWith("consol/")) throw new Error(`bad head: ${head}`);
  console.log("ok: head branch", head);

  const orgId = createId("org");
  const slug = `smoke-${orgId.slice(-8)}`;
  await sql(
    `insert into organizations (id, name, slug, created_by) values ($1, $2, $3, $4)`,
    [orgId, "Smoke Org", slug, "smoke"],
  );

  // Workspace OAuth connection.
  await upsertOrganizationConnection({
    organizationId: orgId,
    provider: "github",
    accountId: "12345",
    accountLogin: "smoke-bot",
    accountAvatarUrl: "",
    scope: "repo,read:user",
    accessToken: "gho_smoke_token",
    createdBy: "smoke",
  });
  const connection = await getPublicOrganizationConnection(orgId, "github");
  if (!connection || connection.account_login !== "smoke-bot") {
    throw new Error(`Unexpected connection: ${JSON.stringify(connection)}`);
  }
  if ("access_token_enc" in connection) {
    throw new Error("Public connection leaked encrypted token field");
  }
  const token = await getOrganizationAccessToken(orgId, "github");
  if (token !== "gho_smoke_token") {
    throw new Error(`Unexpected decrypted token: ${token}`);
  }
  console.log("ok: org OAuth connection", connection.account_login);

  const config = await resolveRepo({ repo: "acme/widget" });
  if (!config || config.owner !== "acme" || config.repo !== "widget") {
    throw new Error(`Unexpected config: ${JSON.stringify(config)}`);
  }
  console.log("ok: resolveRepo from item input", config);

  const deliveryProcess = await ensureOrgProcess({
    organizationId: orgId,
    templateKey: "software-delivery",
    createdBy: "smoke",
  });
  const stages = await listStages(deliveryProcess.id);
  const build = stages.find((s) => s.stage_key === "build");
  if (!build) throw new Error("software-delivery missing build stage");
  const expected = [
    "spec",
    "spec-approve",
    "build",
    "validate",
    "ship-approve",
    "merge",
  ];
  const got = stages.map((s) => s.stage_key);
  if (JSON.stringify(got) !== JSON.stringify(expected)) {
    throw new Error(`Unexpected stages: ${got.join(" → ")}`);
  }
  console.log("ok: software-delivery stages", got.join(" → "));

  const item = await createWorkItem({
    processId: deliveryProcess.id,
    stageId: build.id,
    title: "Ship GitHub open PR",
    body: "Acceptance criteria: open a draft PR.\nImplementation plan: change files.",
    inputs: { repo: "acme/widget" },
    createdBy: "smoke",
  });

  const result = await runOpenPullRequest({
    title: item.title,
    body: item.body,
    stageKey: "open-pr",
    inputs: item.inputs,
    organizationId: orgId,
    processId: deliveryProcess.id,
    workItemId: item.id,
    actorSub: "smoke",
  });
  if (!result.ok || result.outcome !== "success") {
    throw new Error(`open-pr failed: ${result.summary}`);
  }
  console.log("ok: runOpenPullRequest", result.summary);
  console.log("smoke: all checks passed");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
