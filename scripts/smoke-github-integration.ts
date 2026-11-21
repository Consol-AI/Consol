/**
 * Smoke-test GitHub dry-run open-pr against local PGlite.
 * Run: npx tsx scripts/smoke-github-integration.ts
 */
process.env.CONSOL_GITHUB_DRY_RUN = "1";
delete process.env.DATABASE_URL;
delete process.env.GITHUB_TOKEN;
delete process.env.GH_TOKEN;
delete process.env.GITHUB_PAT;

import { createId } from "../src/lib/id";
import { sql } from "../src/lib/db";
import {
  createGithubPullRequest,
  getGithubConfigForProduct,
  githubHeadBranchName,
  upsertGithubIntegration,
} from "../src/lib/integrations";
import { runOpenPullRequest } from "../src/lib/flows/scripts/open-pr";
import { addProcessFromTemplate, createWorkItem, listStages } from "../src/lib/factory";

async function main() {
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
  const productId = createId("prd");
  const slug = `smoke-${orgId.slice(-8)}`;
  await sql(
    `insert into organizations (id, name, slug, created_by) values ($1, $2, $3, $4)`,
    [orgId, "Smoke Org", slug, "smoke"],
  );
  await sql(
    `insert into products (id, organization_id, name, description, created_by)
     values ($1, $2, $3, $4, $5)`,
    [productId, orgId, "Smoke Product", "", "smoke"],
  );

  await upsertGithubIntegration({
    productId,
    owner: "acme",
    repo: "widget",
    baseBranch: "develop",
    headBranchPrefix: "consol/",
    createdBy: "smoke",
  });
  const config = await getGithubConfigForProduct(productId);
  if (!config || config.owner !== "acme" || config.repo !== "widget") {
    throw new Error(`Unexpected config: ${JSON.stringify(config)}`);
  }
  console.log("ok: upsertGithubIntegration", config);

  const process = await addProcessFromTemplate({
    productId,
    templateKey: "software-delivery",
    createdBy: "smoke",
  });
  const stages = await listStages(process.id);
  const openPr = stages.find((s) => s.stage_key === "open-pr");
  if (!openPr) throw new Error("software-delivery missing open-pr stage");
  console.log(
    "ok: software-delivery stages",
    stages.map((s) => s.stage_key).join(" → "),
  );

  const item = await createWorkItem({
    processId: process.id,
    stageId: openPr.id,
    title: "Ship GitHub open PR",
    body: "Acceptance criteria: open a draft PR.\nImplementation plan: change files.",
    createdBy: "smoke",
  });

  const result = await runOpenPullRequest({
    title: item.title,
    body: item.body,
    stageKey: "open-pr",
    productId,
    processId: process.id,
    workItemId: item.id,
    actorSub: "smoke",
  });
  if (!result.ok || result.outcome !== "success") {
    throw new Error(`open-pr failed: ${result.summary}`);
  }
  console.log("ok: runOpenPullRequest", result.summary);
  console.log("smoke: all checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
