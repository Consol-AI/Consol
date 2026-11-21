import { getProduct, updateWorkItem } from "@/lib/factory";
import {
  createAgentRun,
  listAgentRunsForWorkItem,
  isActiveAgentRunStatus,
  updateAgentRun,
} from "@/lib/integrations/agent-runs";
import {
  createCursorAgent,
  extractPrFromRun,
  isSuccessfulRunStatus,
} from "@/lib/integrations/cursor/client";
import { getCursorApiKey } from "@/lib/integrations/cursor/credentials";
import {
  addWorkItemExternalLink,
  getGithubConfigForProduct,
  listWorkItemExternalLinks,
} from "@/lib/integrations";
import type { ScriptRunInput, ScriptRunResult } from "@/lib/flows/scripts/types";

function alreadyHasGithubPr(body: string): string | null {
  const match = body.match(
    /https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+/i,
  );
  return match?.[0] ?? null;
}

async function linkPr(input: {
  workItemId: string;
  title: string;
  body: string;
  prUrl: string;
  actorSub: string;
  branch?: string;
  agentId?: string;
  dryRun?: boolean;
}) {
  const existingLinks = await listWorkItemExternalLinks(input.workItemId);
  const prior = existingLinks.find(
    (link) => link.provider === "github" && link.link_type === "pull_request",
  );
  if (!prior) {
    const numberMatch = input.prUrl.match(/\/pull\/(\d+)/i);
    await addWorkItemExternalLink({
      workItemId: input.workItemId,
      provider: "github",
      linkType: "pull_request",
      externalId: numberMatch?.[1] ?? "",
      url: input.prUrl,
      title: input.title,
      metadata: {
        branch: input.branch ?? "",
        agentId: input.agentId ?? "",
        dryRun: Boolean(input.dryRun),
        source: "cursor-build",
      },
      createdBy: input.actorSub,
    });
  }

  if (!input.body.includes(input.prUrl)) {
    const nextBody = [
      input.body.trim(),
      "",
      "---",
      `### Pull request`,
      input.prUrl,
    ]
      .join("\n")
      .trim();
    await updateWorkItem({
      itemId: input.workItemId,
      title: input.title,
      body: nextBody,
    });
  }
}

/** Launch (or resume) a Cursor Cloud Agent build for the work item. */
export async function runCursorBuild(
  input: ScriptRunInput,
): Promise<ScriptRunResult> {
  if (!input.productId || !input.workItemId || !input.processId) {
    return {
      ok: false,
      outcome: "failure",
      summary:
        "Cursor build failed: product, process, and work item context are required.",
    };
  }

  const existingInBody = alreadyHasGithubPr(input.body);
  const existingLinks = await listWorkItemExternalLinks(input.workItemId);
  const priorPr = existingLinks.find(
    (link) => link.provider === "github" && link.link_type === "pull_request",
  );
  const prUrl = existingInBody || priorPr?.url || null;
  if (prUrl) {
    return {
      ok: true,
      outcome: "success",
      summary: `Build already produced a pull request: ${prUrl}`,
    };
  }

  const runs = await listAgentRunsForWorkItem(input.workItemId);
  const active = runs.find((r) => isActiveAgentRunStatus(r.status));
  if (active) {
    return {
      ok: true,
      outcome: "pending",
      summary: `Cursor build already in progress (${active.status}). Agent: ${active.agent_url || active.external_agent_id}`,
    };
  }

  // A finished run without a PR link yet — treat as failure so human can retry.
  const latest = runs[0];
  if (
    latest &&
    latest.status.toUpperCase() === "FINISHED" &&
    !latest.pr_url &&
    !prUrl
  ) {
    return {
      ok: false,
      outcome: "failure",
      summary:
        "Previous Cursor build finished without a pull request. Re-run build after fixing the agent prompt or repo access.",
    };
  }

  const product = await getProduct(input.productId);
  if (!product) {
    return {
      ok: false,
      outcome: "failure",
      summary: "Cursor build failed: product not found.",
    };
  }

  const config = await getGithubConfigForProduct(input.productId);
  if (!config) {
    return {
      ok: false,
      outcome: "failure",
      summary:
        "Cursor build failed: link a default GitHub repository for this product under Connectors → GitHub.",
    };
  }

  const apiKey = await getCursorApiKey(product.organization_id);
  const repoUrl = `https://github.com/${config.owner}/${config.repo}`;
  const prompt = [
    `Implement this Consol work item against ${config.owner}/${config.repo}.`,
    "",
    `# ${input.title}`,
    "",
    input.body.trim() || "(no brief yet)",
    "",
    "Open a pull request when done. Keep the change focused and include verification notes in the PR body.",
  ].join("\n");

  try {
    const created = await createCursorAgent({
      apiKey: apiKey ?? "",
      prompt,
      repoUrl,
      startingRef: config.baseBranch,
      name: input.title.slice(0, 100),
      autoCreatePR: true,
    });

    const { prUrl: immediatePr, branch } = extractPrFromRun(created.run);
    const status = created.dryRun
      ? "FINISHED"
      : created.run.status || "CREATING";

    const agentRun = await createAgentRun({
      workItemId: input.workItemId,
      processId: input.processId,
      provider: "cursor",
      externalAgentId: created.agent.id,
      externalRunId: created.run.id,
      status,
      prompt,
      repoUrl,
      branch: branch ?? "",
      prUrl: immediatePr ?? "",
      agentUrl: created.agent.url ?? `https://cursor.com/agents/${created.agent.id}`,
      resultSummary: created.run.text ?? "",
      metadata: { dryRun: created.dryRun },
      createdBy: input.actorSub ?? "system",
    });

    if (immediatePr && isSuccessfulRunStatus(status)) {
      await linkPr({
        workItemId: input.workItemId,
        title: input.title,
        body: input.body,
        prUrl: immediatePr,
        actorSub: input.actorSub ?? "system",
        branch: branch ?? undefined,
        agentId: created.agent.id,
        dryRun: created.dryRun,
      });
      await updateAgentRun(agentRun.id, {
        status: "FINISHED",
        prUrl: immediatePr,
        branch: branch ?? undefined,
        resultSummary: created.run.text ?? "Cursor build finished.",
      });
      return {
        ok: true,
        outcome: "success",
        summary: created.dryRun
          ? `Dry-run Cursor build finished and opened ${immediatePr}`
          : `Cursor build finished and opened ${immediatePr}`,
      };
    }

    return {
      ok: true,
      outcome: "pending",
      summary: `Cursor Cloud Agent started (${created.agent.id}). Track progress at ${agentRun.agent_url}.`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Cursor API error";
    return {
      ok: false,
      outcome: "failure",
      summary: `Cursor build failed: ${message}`,
    };
  }
}
