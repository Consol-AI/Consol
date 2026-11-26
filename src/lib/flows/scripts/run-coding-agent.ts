import { getCodingAgent } from "@/lib/coding-agents";
import { updateWorkItem } from "@/lib/factory";
import {
  createAgentRun,
  listAgentRunsForWorkItem,
  isActiveAgentRunStatus,
  updateAgentRun,
} from "@/lib/integrations/agent-runs";
import {
  addWorkItemExternalLink,
  listWorkItemExternalLinks,
} from "@/lib/integrations";
import { resolveRepo } from "@/lib/integrations/local";
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
        source: "coding-agent",
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

/**
 * Launch (or resume) a coding agent build for the work item. The provider
 * comes from stage config `agent` (default: cursor).
 */
export async function runCodingAgentBuild(
  input: ScriptRunInput,
): Promise<ScriptRunResult> {
  if (!input.organizationId || !input.workItemId || !input.processId) {
    return {
      ok: false,
      outcome: "failure",
      summary:
        "Build failed: workspace, process, and work item context are required.",
    };
  }

  const agentKey =
    typeof input.config?.agent === "string" ? input.config.agent : null;
  const agent = getCodingAgent(agentKey);
  if (!agent) {
    return {
      ok: false,
      outcome: "failure",
      summary: `Build failed: unknown coding agent "${agentKey}".`,
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
      summary: `${agent.name} build already in progress (${active.status}). Agent: ${active.agent_url || active.external_agent_id}`,
    };
  }

  // A finished run without a PR link yet — treat as failure so human can retry.
  const latest = runs[0];
  if (latest && latest.status.toUpperCase() === "FINISHED" && !latest.pr_url) {
    return {
      ok: false,
      outcome: "failure",
      summary:
        "Previous build finished without a pull request. Re-run build after fixing the agent prompt or repo access.",
    };
  }

  const repo = await resolveRepo(input.inputs);
  if (!repo) {
    return {
      ok: false,
      outcome: "failure",
      summary:
        "Build failed: no GitHub repo. Set the item's repo input or CONSOL_GITHUB_REPO, or run Consol from a git checkout with a GitHub origin.",
    };
  }

  const repoUrl = `https://github.com/${repo.owner}/${repo.repo}`;
  const prompt = [
    `Implement this Consol work item against ${repo.owner}/${repo.repo}.`,
    "",
    `# ${input.title}`,
    "",
    input.body.trim() || "(no brief yet)",
    "",
    "Open a pull request when done. Keep the change focused and include verification notes in the PR body.",
  ].join("\n");

  try {
    const launched = await agent.launch({
      organizationId: input.organizationId,
      workItemId: input.workItemId,
      prompt,
      title: input.title,
      repo,
    });

    const agentRun = await createAgentRun({
      workItemId: input.workItemId,
      processId: input.processId,
      provider: agent.key,
      externalAgentId: launched.externalAgentId,
      externalRunId: launched.externalRunId,
      status: launched.status,
      prompt,
      repoUrl,
      branch: launched.branch ?? "",
      prUrl: launched.prUrl ?? "",
      agentUrl: launched.agentUrl,
      resultSummary: launched.text ?? "",
      metadata: { dryRun: launched.dryRun },
      createdBy: input.actorSub ?? "system",
    });

    if (launched.prUrl && agent.isSuccessful(launched.status)) {
      await linkPr({
        workItemId: input.workItemId,
        title: input.title,
        body: input.body,
        prUrl: launched.prUrl,
        actorSub: input.actorSub ?? "system",
        branch: launched.branch ?? undefined,
        agentId: launched.externalAgentId,
        dryRun: launched.dryRun,
      });
      await updateAgentRun(agentRun.id, {
        status: "FINISHED",
        prUrl: launched.prUrl,
        branch: launched.branch ?? undefined,
        resultSummary: launched.text ?? `${agent.name} build finished.`,
      });
      return {
        ok: true,
        outcome: "success",
        summary: launched.dryRun
          ? `Dry-run ${agent.name} build finished and opened ${launched.prUrl}`
          : `${agent.name} build finished and opened ${launched.prUrl}`,
      };
    }

    return {
      ok: true,
      outcome: "pending",
      summary: `${agent.name} agent started (${launched.externalAgentId}). Track progress at ${agentRun.agent_url}.`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : `Unknown ${agent.name} error`;
    return {
      ok: false,
      outcome: "failure",
      summary: `${agent.name} build failed: ${message}`,
    };
  }
}
