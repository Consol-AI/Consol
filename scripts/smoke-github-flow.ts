/**
 * End-to-end dry-run of software delivery through Cursor build + validate.
 * Run: npx tsx scripts/smoke-github-flow.ts
 */
process.env.CONSOL_GITHUB_DRY_RUN = "1";
process.env.CONSOL_CURSOR_DRY_RUN = "1";
delete process.env.DATABASE_URL;
delete process.env.GITHUB_TOKEN;
delete process.env.CURSOR_API_KEY;

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
    owner: "leaguesports",
    repo: "landing-page",
    createdBy: "smoke",
  });

  const deliveryProcess = await addProcessFromTemplate({
    productId,
    templateKey: "software-delivery",
    createdBy: "smoke",
  });
  const stages = await listStages(deliveryProcess.id);
  const entry = stages.find((s) => s.stage_key === "spec")!;
  const item = await createWorkItem({
    processId: deliveryProcess.id,
    stageId: entry.id,
    title: "End-to-end Cursor build",
    body: "Acceptance criteria: PR opens.\nImplementation: change files under src/.",
    createdBy: "smoke",
  });

  // Spec → Spec approve
  let result = await advanceWorkItem({
    itemId: item.id,
    outcome: "default",
    actorSub: "smoke",
    execute: true,
  });
  console.log("spec→", result.toStageKey, result.summary);
  if (result.toStageKey !== "spec-approve") {
    throw new Error(`Expected spec-approve, got ${result.toStageKey}`);
  }

  // Approve → Build (dry-run Cursor finishes with PR → may land on validate)
  result = await advanceWorkItem({
    itemId: item.id,
    outcome: "approve",
    actorSub: "smoke",
  });
  console.log("spec-approve→", result.toStageKey, result.summary);

  let refreshed = await getWorkItem(item.id);
  let current = (await listStages(deliveryProcess.id)).find(
    (s) => s.id === refreshed!.stage_id,
  );

  if (current?.stage_key === "build") {
    result = await advanceWorkItem({
      itemId: item.id,
      outcome: "default",
      actorSub: "smoke",
      execute: true,
    });
    console.log("build→", result.toStageKey, result.summary);
  }

  refreshed = await getWorkItem(item.id);
  current = (await listStages(deliveryProcess.id)).find(
    (s) => s.id === refreshed!.stage_id,
  );
  if (current?.stage_key === "validate") {
    result = await advanceWorkItem({
      itemId: item.id,
      outcome: "default",
      actorSub: "smoke",
      execute: true,
    });
    console.log("validate→", result.toStageKey, result.summary);
  }

  const links = await listWorkItemExternalLinks(item.id);
  if (links.length < 1 || links[0].link_type !== "pull_request") {
    throw new Error(`Expected PR link, got ${JSON.stringify(links)}`);
  }
  console.log("link:", links[0].url);

  refreshed = await getWorkItem(item.id);
  if (!refreshed?.body.includes(links[0].url)) {
    throw new Error("Work item body missing PR url");
  }

  const events = await listStageRunEvents(item.id);
  const buildEvent = events.find((e) => e.stage_key === "build");
  if (!buildEvent || (buildEvent.outcome !== "success" && buildEvent.outcome !== "pending")) {
    throw new Error(`Missing build event: ${JSON.stringify(events)}`);
  }

  console.log("smoke-flow: all checks passed");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
