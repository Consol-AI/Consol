import {
  assertProcessAccess,
  createWorkItem,
  ensureOrgProcess,
  ensureWorkspace,
  listOrganizationWorkItems,
  listStages,
} from "../src/lib/factory";
import {
  formatFlowInputsBlock,
  getFlow,
  validateFlowInputs,
} from "../src/lib/flows";

async function main() {
  const viewer = {
    sub: "user:demo",
    name: "Demo Teammate",
    email: "demo@example.com",
  };
  const org = await ensureWorkspace(viewer);
  const flow = getFlow("software-delivery");
  if (!flow) throw new Error("missing flow");

  const validated = validateFlowInputs(flow.inputs, {
    title: "Ship Work section",
    goal: "Let teammates start flows without a product",
    repo: "Consol-AI/Consol",
    acceptance: "Can start from /app/work/new and see job listed",
  });
  if (!validated.ok) throw new Error(validated.error);

  const process = await ensureOrgProcess({
    organizationId: org.id,
    templateKey: flow.key,
    createdBy: viewer.sub,
  });
  const stages = await listStages(process.id);
  const entry = stages.find((s) => s.stage_key === flow.entry) ?? stages[0];
  if (!entry) throw new Error("no entry");

  const item = await createWorkItem({
    processId: process.id,
    stageId: entry.id,
    title: validated.inputs.title,
    body: formatFlowInputsBlock(validated.inputs, flow.inputs),
    inputs: validated.inputs,
    createdBy: viewer.sub,
  });

  const access = await assertProcessAccess(process.id, viewer.sub);
  const listed = await listOrganizationWorkItems(org.id);

  console.log(
    JSON.stringify(
      {
        processOrgId: process.organization_id,
        itemId: item.id,
        inputs: item.inputs,
        accessOk: Boolean(access),
        listedCount: listed.length,
        listedTitles: listed.map((i) => i.title),
      },
      null,
      2,
    ),
  );
}

// PGlite keeps the event loop alive; exit explicitly once checks pass.
main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
