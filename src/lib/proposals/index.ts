import { sql } from "@/lib/db";
import {
  addMessage,
  assertOrgAccess,
  type Message,
} from "@/lib/factory";
import { getFlow, validateFlowInputs } from "@/lib/flows";
import { startFlowWorkItem } from "@/lib/flows/start";
import { githubRepoVisible } from "@/lib/integrations/github/client";
import {
  getGithubToken,
  parseOwnerRepo,
  resolveRepo,
} from "@/lib/integrations/local";
import { createId } from "@/lib/id";
import {
  proposalFields,
  REPO_INPUT_KEY,
  type ProposalState,
  type WorkProposalView,
} from "@/lib/proposals/types";
import { workItemHref } from "@/lib/work-links";

export type * from "@/lib/proposals/types";

type ProposalRow = {
  id: string;
  organization_id: string;
  message_id: string | null;
  flow_key: string;
  inputs: unknown;
  state: ProposalState;
  error: string | null;
  work_item_id: string | null;
  created_at: string | Date;
  item_title: string | null;
  item_status: string | null;
  stage_name: string | null;
  stage_type: string | null;
};

const SELECT_PROPOSALS = `
  select p.id, p.organization_id, p.message_id, p.flow_key, p.inputs,
         p.state, p.error, p.work_item_id, p.created_at,
         wi.title as item_title, wi.status as item_status,
         s.name as stage_name, coalesce(s.stage_type, 'legacy') as stage_type
  from work_proposals p
  left join work_items wi on wi.id = p.work_item_id and wi.deleted_at is null
  left join stages s on s.id = wi.stage_id`;

function parseInputs(raw: unknown): Record<string, string> {
  const value =
    typeof raw === "string" ? (JSON.parse(raw) as unknown) : (raw ?? {});
  const inputs: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (typeof entry === "string") inputs[key] = entry;
  }
  return inputs;
}

function toView(row: ProposalRow): WorkProposalView {
  return {
    id: row.id,
    message_id: row.message_id,
    flow_key: row.flow_key,
    inputs: parseInputs(row.inputs),
    state: row.state,
    error: row.error,
    work_item:
      row.work_item_id && row.item_title !== null
        ? {
            id: row.work_item_id,
            href: workItemHref({ id: row.work_item_id }),
            title: row.item_title,
            status: row.item_status ?? "open",
            stage_name: row.stage_name ?? "",
            stage_type: row.stage_type ?? "legacy",
          }
        : null,
    created_at:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  };
}

async function getProposalRow(id: string): Promise<ProposalRow | null> {
  return (
    (await sql<ProposalRow>(`${SELECT_PROPOSALS} where p.id = $1`, [id]))[0] ??
    null
  );
}

export async function listProposals(
  organizationId: string,
): Promise<WorkProposalView[]> {
  const rows = await sql<ProposalRow>(
    `${SELECT_PROPOSALS} where p.organization_id = $1 order by p.created_at asc`,
    [organizationId],
  );
  return rows.map(toView);
}

/** Record a new proposal; any still-open proposal in the thread is superseded. */
export async function createProposal(input: {
  organizationId: string;
  messageId: string;
  sourceMessageId: string | null;
  flowKey: string;
  inputs: Record<string, string>;
  createdBy: string;
}): Promise<WorkProposalView> {
  await sql(
    `update work_proposals set state = 'superseded', updated_at = now()
     where organization_id = $1 and state = 'proposed'`,
    [input.organizationId],
  );
  const id = createId("wpr");
  await sql(
    `insert into work_proposals (
       id, organization_id, message_id, source_message_id,
       flow_key, inputs, created_by
     ) values ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
    [
      id,
      input.organizationId,
      input.messageId,
      input.sourceMessageId,
      input.flowKey,
      JSON.stringify(input.inputs),
      input.createdBy,
    ],
  );
  return toView((await getProposalRow(id))!);
}

/** Repos the workspace can use without naming one: env or this checkout. */
export async function knownRepos(): Promise<string[]> {
  const repo = await resolveRepo(null);
  return repo ? [`${repo.owner}/${repo.repo}`] : [];
}

/**
 * Server-side repo authorization. With a GitHub credential, the repo must be
 * visible to it. Without one, only the workspace's default repo is allowed.
 */
export async function checkRepoAccess(
  organizationId: string,
  repo: { owner: string; repo: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const name = `${repo.owner}/${repo.repo}`;
  const token = await getGithubToken(organizationId);
  if (token) {
    try {
      return (await githubRepoVisible({ ...repo, token }))
        ? { ok: true }
        : {
            ok: false,
            error: `This workspace's GitHub access can't see ${name}.`,
          };
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown error";
      return { ok: false, error: `Couldn't verify access to ${name}: ${detail}` };
    }
  }
  const allowed = await knownRepos();
  if (allowed.some((entry) => entry.toLowerCase() === name.toLowerCase())) {
    return { ok: true };
  }
  return {
    ok: false,
    error: `Connect GitHub to start work on ${name}. Without a connection only ${allowed[0] ?? "this checkout's repo"} is available.`,
  };
}

export type ProposalActionResult =
  | { ok: true; proposal: WorkProposalView; message?: Message }
  | {
      ok: false;
      status: number;
      error: string;
      proposal?: WorkProposalView;
    };

async function loadForViewer(
  id: string,
  viewerSub: string,
): Promise<
  | { ok: true; row: ProposalRow }
  | { ok: false; status: number; error: string }
> {
  const row = await getProposalRow(id);
  if (!row) return { ok: false, status: 404, error: "Proposal not found" };
  if (!(await assertOrgAccess(row.organization_id, viewerSub))) {
    return { ok: false, status: 403, error: "Forbidden" };
  }
  return { ok: true, row };
}

/** Item already created for this proposal (survives a crash mid-confirm). */
async function findStartedItemId(proposalId: string): Promise<string | null> {
  const rows = await sql<{ id: string }>(
    `select id from work_items
     where origin->>'proposal_id' = $1 and deleted_at is null
     order by created_at asc limit 1`,
    [proposalId],
  );
  return rows[0]?.id ?? null;
}

async function markConfirmed(
  proposalId: string,
  workItemId: string,
  error: string | null = null,
): Promise<void> {
  await sql(
    `update work_proposals
     set state = 'confirmed', work_item_id = $2, error = $3, updated_at = now()
     where id = $1`,
    [proposalId, workItemId, error],
  );
}

export async function getProposalForViewer(
  id: string,
  viewerSub: string,
): Promise<ProposalActionResult> {
  const loaded = await loadForViewer(id, viewerSub);
  if (!loaded.ok) return loaded;
  return { ok: true, proposal: toView(loaded.row) };
}

export async function dismissProposal(
  id: string,
  viewerSub: string,
): Promise<ProposalActionResult> {
  const loaded = await loadForViewer(id, viewerSub);
  if (!loaded.ok) return loaded;
  await sql(
    `update work_proposals set state = 'dismissed', updated_at = now()
     where id = $1 and state = 'proposed'`,
    [id],
  );
  const proposal = toView((await getProposalRow(id))!);
  if (proposal.state !== "dismissed") {
    return {
      ok: false,
      status: 409,
      error: `Proposal is already ${proposal.state}`,
      proposal,
    };
  }
  return { ok: true, proposal };
}

/**
 * Confirm a proposal with the user's final (possibly edited) fields: create
 * the work item and start its flow. Idempotent on the proposal id — a retry
 * or double click returns the same work item and never creates another.
 */
export async function confirmProposal(input: {
  id: string;
  viewerSub: string;
  flowKey: string;
  inputs: Record<string, string>;
}): Promise<ProposalActionResult> {
  const loaded = await loadForViewer(input.id, input.viewerSub);
  if (!loaded.ok) return loaded;
  const { row } = loaded;

  if (row.state === "confirmed") return { ok: true, proposal: toView(row) };
  if (row.state === "starting") {
    const itemId = await findStartedItemId(row.id);
    if (itemId) await markConfirmed(row.id, itemId);
    return { ok: true, proposal: toView((await getProposalRow(row.id))!) };
  }
  if (row.state !== "proposed") {
    return {
      ok: false,
      status: 409,
      error: `Proposal is ${row.state}`,
      proposal: toView(row),
    };
  }

  const flow = getFlow(input.flowKey);
  if (!flow) return { ok: false, status: 400, error: "Unknown flow" };
  const validated = validateFlowInputs(proposalFields(flow), input.inputs);
  if (!validated.ok) return { ok: false, status: 400, error: validated.error };
  const inputs = validated.inputs;

  if (flow.inputs.some((field) => field.key === REPO_INPUT_KEY)) {
    const ref = parseOwnerRepo(inputs[REPO_INPUT_KEY]);
    if (!ref) {
      return {
        ok: false,
        status: 400,
        error: "Repository must look like owner/repo",
      };
    }
    inputs[REPO_INPUT_KEY] = `${ref.owner}/${ref.repo}`;
    const access = await checkRepoAccess(row.organization_id, ref);
    if (!access.ok) return { ok: false, status: 403, error: access.error };
  }

  // Claim the proposal atomically so concurrent confirms start one item.
  const claimed = await sql<{ id: string }>(
    `update work_proposals
     set state = 'starting', flow_key = $2, inputs = $3::jsonb,
         error = null, confirmed_by = $4, updated_at = now()
     where id = $1 and state = 'proposed'
     returning id`,
    [row.id, flow.key, JSON.stringify(inputs), input.viewerSub],
  );
  if (!claimed[0]) {
    // Lost the race to another confirm/dismiss; answer from the new state.
    return confirmProposal(input);
  }

  try {
    const { item } = await startFlowWorkItem({
      organizationId: row.organization_id,
      actorSub: input.viewerSub,
      flow,
      inputs,
      origin: {
        type: "chat",
        proposal_id: row.id,
        ...(row.message_id ? { message_id: row.message_id } : {}),
      },
    });
    await markConfirmed(row.id, item.id);
    const message = await addMessage({
      organizationId: row.organization_id,
      role: "assistant",
      content: `Started **${item.title}** on the ${flow.name} flow → [Open work item](${workItemHref(item)})`,
      authorName: "Forge AI",
    });
    return {
      ok: true,
      proposal: toView((await getProposalRow(row.id))!),
      message,
    };
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Could not start the flow";
    const itemId = await findStartedItemId(row.id);
    if (itemId) {
      // The item exists but its first stage didn't queue; keep the link so a
      // retry can't create a duplicate, and surface the problem.
      await markConfirmed(row.id, itemId, detail);
      return { ok: true, proposal: toView((await getProposalRow(row.id))!) };
    }
    await sql(
      `update work_proposals set state = 'proposed', error = $2, updated_at = now()
       where id = $1`,
      [row.id, detail],
    );
    return {
      ok: false,
      status: 500,
      error: detail,
      proposal: toView((await getProposalRow(row.id))!),
    };
  }
}
