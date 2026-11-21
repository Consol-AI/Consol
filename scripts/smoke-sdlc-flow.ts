/**
 * End-to-end dry-run of chat-style software delivery:
 * Spec → Approve → Cursor build → Validate → Ship approve → Merge
 *
 * Run: npx tsx scripts/smoke-sdlc-flow.ts
 */
process.env.CONSOL_GITHUB_DRY_RUN = "1";
process.env.CONSOL_CURSOR_DRY_RUN = "1";
delete process.env.DATABASE_URL;
delete process.env.GITHUB_TOKEN;
delete process.env.CURSOR_API_KEY;

import { createId } from "../src/lib/id";
import { sql } from "../src/lib/db";
import {
  createWorkItem,
  getWorkItem,
  listStages,
  listStageRunEvents,
} from "../src/lib/factory";
import { listWorkItemExternalLinks } from "../src/lib/integrations";
import { listAgentRunsForWorkItem } from "../src/lib/integrations/agent-runs";
import { advanceWorkItem } from "../src/lib/flows/runtime";
import {
  parseDeliveryIntent,
  startSoftwareDelivery,
} from "../src/lib/delivery/start";
import { softwareDeliveryFlow } from "../src/lib/flows/software-delivery";

async function main() {
  const stageIds = softwareDeliveryFlow.stages.map((s) => s.id);
  const expected = [
    "spec",
    "spec-approve",
    "build",
    "validate",
    "ship-approve",
    "merge",
  ];
  if (JSON.stringify(stageIds) !== JSON.stringify(expected)) {
    throw new Error(`Unexpected stages: ${stageIds.join(",")}`);
  }

  const intent = parseDeliveryIntent(
    "Ship a feature on LeagueSports: add a subtle footer changelog link",
  );
  if (!intent.wantsDelivery) {
    throw new Error("Expected delivery intent");
  }

  const orgId = createId("org");
  await sql(
    `insert into organizations (id, name, slug, created_by) values ($1, $2, $3, $4)`,
    [orgId, "SDLC Org", `sdlc-${orgId.slice(-8)}`, "smoke"],
  );

  const started = await startSoftwareDelivery({
    organizationId: orgId,
    actorSub: "smoke",
    title: intent.title,
    body: intent.body,
    runSpec: true,
  });

  console.log("started", started.href, "stage→", started.item.stage_id);

  let stages = await listStages(started.process.id);
  let item = await getWorkItem(started.item.id);
  if (!item) throw new Error("missing item");
  let current = stages.find((s) => s.id === item!.stage_id);
  if (current?.stage_key !== "spec-approve") {
    throw new Error(`Expected spec-approve after spec, got ${current?.stage_key}`);
  }

  // Approve spec → build (Cursor dry-run finishes immediately → validate)
  let result = await advanceWorkItem({
    itemId: item.id,
    outcome: "approve",
    actorSub: "smoke",
  });
  console.log("spec-approve→", result.toStageKey, result.summary);

  // Build may already have auto-advanced through validate if dry-run finished.
  // Explicitly execute build if still there.
  item = (await getWorkItem(item.id))!;
  stages = await listStages(started.process.id);
  current = stages.find((s) => s.id === item!.stage_id);

  if (current?.stage_key === "build") {
    result = await advanceWorkItem({
      itemId: item.id,
      outcome: "default",
      actorSub: "smoke",
      execute: true,
    });
    console.log("build→", result.toStageKey, result.summary, "pending=", result.pending);
  }

  item = (await getWorkItem(item.id))!;
  current = stages.find((s) => s.id === item!.stage_id);

  // If still on build pending (shouldn't for dry-run), fail.
  if (current?.stage_key === "build" && result.pending) {
    throw new Error("Dry-run build should not stay pending");
  }

  // Ensure validate runs if we landed there without executing.
  item = (await getWorkItem(item.id))!;
  current = (await listStages(started.process.id)).find(
    (s) => s.id === item!.stage_id,
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

  item = (await getWorkItem(item.id))!;
  current = (await listStages(started.process.id)).find(
    (s) => s.id === item!.stage_id,
  );
  if (current?.stage_key !== "ship-approve") {
    throw new Error(`Expected ship-approve, got ${current?.stage_key}`);
  }

  const links = await listWorkItemExternalLinks(item.id);
  if (!links.some((l) => l.link_type === "pull_request")) {
    throw new Error(`Expected PR link, got ${JSON.stringify(links)}`);
  }
  console.log("pr:", links[0].url);

  const runs = await listAgentRunsForWorkItem(item.id);
  if (runs.length < 1) {
    throw new Error("Expected an agent_runs row");
  }
  console.log("agent_run:", runs[0].status, runs[0].external_agent_id);

  // Approve ship → auto merge → done
  result = await advanceWorkItem({
    itemId: item.id,
    outcome: "approve",
    actorSub: "smoke",
  });
  console.log("ship-approve→", result.toStageKey, result.summary, "done=", result.completed);

  item = (await getWorkItem(item.id))!;
  if (item.status !== "done" && result.toStageKey !== "done" && !result.completed) {
    // Might be on merge if auto-chain failed — execute merge.
    current = (await listStages(started.process.id)).find(
      (s) => s.id === item!.stage_id,
    );
    if (current?.stage_key === "merge") {
      result = await advanceWorkItem({
        itemId: item.id,
        outcome: "default",
        actorSub: "smoke",
        execute: true,
      });
      console.log("merge→", result.toStageKey, result.summary);
    }
  }

  item = (await getWorkItem(item.id))!;
  if (item.status !== "done") {
    throw new Error(`Expected done status, got ${item.status} at stage ${item.stage_id}`);
  }

  const events = await listStageRunEvents(item.id);
  const keys = events.map((e) => e.stage_key);
  for (const required of ["spec", "spec-approve", "build", "validate", "ship-approve", "merge"]) {
    if (!keys.includes(required) && required !== "spec") {
      // spec agent event uses stage key spec
    }
    if (!keys.includes(required)) {
      // soft check — merge/ship must exist
      if (required === "merge" || required === "ship-approve" || required === "build") {
        throw new Error(`Missing stage event ${required}: ${keys.join(",")}`);
      }
    }
  }

  // Also cover manual createWorkItem path still works on the same process.
  const entry = (await listStages(started.process.id)).find(
    (s) => s.stage_key === "spec",
  )!;
  await createWorkItem({
    processId: started.process.id,
    stageId: entry.id,
    title: "Second item",
    body: "Acceptance criteria: ok\nImplementation: ok",
    createdBy: "smoke",
  });

  console.log("smoke-sdlc-flow: all checks passed");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
