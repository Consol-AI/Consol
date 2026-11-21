/**
 * End-to-end dry-run of software delivery through Open PR.
 * Run: npx tsx scripts/smoke-github-flow.ts
 */
process.env.CONSOL_GITHUB_DRY_RUN = "1";
delete process.env.DATABASE_URL;
delete process.env.GITHUB_TOKEN;

import { createId } from "../src/lib/id";
import { sql } from "../src/lib/db";
import {
  addProcessFromTemplate,
  createWorkItem,
  getWorkItem,
  listStages,
  listStageRunEvents,
} from "../src/lib/factory";
import { listWorkItemExternalLinks, upsertGithubIntegration } from "../src/lib/integrations";
import { advanceWorkItem } from "../src/lib/flows/runtime";

async function main() {
  const orgId = createId("org");
  const productId = createId("prd");
  await sql(
    `insert into organizations (id, name, slug, created_by) values ($1, $2, $3, $4)`,
    [orgId, "Flow Org", `flow-${orgId.slice(-8)}`, "smoke"],
  );
  await sql(
    `insert into products (id, organization_id, name, description, created_by)
     values ($1, $2, $3, $4, $5)`,
    [productId, orgId, "Flow Product", "", "smoke"],
  );

  await upsertGithubIntegration({
    productId,
    owner: "acme",
    repo: "widget",
    createdBy: "smoke",
  });

  const process = await addProcessFromTemplate({
    productId,
    templateKey: "software-delivery",
    createdBy: "smoke",
  });
  const stages = await listStages(process.id);
  const entry = stages.find((s) => s.stage_key === "spec")!;
  const item = await createWorkItem({
    processId: process.id,
    stageId: entry.id,
    title: "End-to-end open PR",
    body: "Acceptance criteria: PR opens.\nImplementation: change files under src/.",
    createdBy: "smoke",
  });

  // Spec → Build
  let result = await advanceWorkItem({
    itemId: item.id,
    outcome: "default",
    actorSub: "smoke",
    execute: true,
  });
  console.log("spec→", result.toStageKey, result.summary);

  // Build → Open PR
  result = await advanceWorkItem({
    itemId: item.id,
    outcome: "default",
    actorSub: "smoke",
    execute: true,
  });
  console.log("build→", result.toStageKey, result.summary);

  // Open PR → Review
  result = await advanceWorkItem({
    itemId: item.id,
    outcome: "success",
    actorSub: "smoke",
    execute: true,
  });
  console.log("open-pr→", result.toStageKey, result.summary);
  if (result.toStageKey !== "review") {
    throw new Error(`Expected review, got ${result.toStageKey}`);
  }

  const links = await listWorkItemExternalLinks(item.id);
  if (links.length !== 1 || links[0].link_type !== "pull_request") {
    throw new Error(`Expected one PR link, got ${JSON.stringify(links)}`);
  }
  console.log("link:", links[0].url);

  const refreshed = await getWorkItem(item.id);
  if (!refreshed?.body.includes(links[0].url)) {
    throw new Error("Work item body missing PR url");
  }

  const events = await listStageRunEvents(item.id);
  const openEvent = events.find((e) => e.stage_key === "open-pr");
  if (!openEvent || openEvent.outcome !== "success") {
    throw new Error(`Missing open-pr success event: ${JSON.stringify(events)}`);
  }

  console.log("smoke-flow: all checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
