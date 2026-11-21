import { getProduct, updateWorkItem } from "@/lib/factory";
import {
  addWorkItemExternalLink,
  createGithubPullRequest,
  getGithubConfigForProduct,
  githubHeadBranchName,
  listWorkItemExternalLinks,
} from "@/lib/integrations";
import { getOrganizationAccessToken } from "@/lib/integrations/connections";
import type { ScriptRunInput, ScriptRunResult } from "@/lib/flows/scripts/types";

function alreadyHasGithubPr(body: string): string | null {
  const match = body.match(
    /https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+/i,
  );
  return match?.[0] ?? null;
}

/** Open (or dry-run) a GitHub draft PR for the current work item. */
export async function runOpenPullRequest(
  input: ScriptRunInput,
): Promise<ScriptRunResult> {
  if (!input.productId || !input.workItemId) {
    return {
      ok: false,
      outcome: "failure",
      summary:
        "Open PR failed: product and work item context are required for GitHub.",
    };
  }

  const existingInBody = alreadyHasGithubPr(input.body);
  if (existingInBody) {
    return {
      ok: true,
      outcome: "success",
      summary: `Pull request already linked: ${existingInBody}`,
    };
  }

  const existingLinks = await listWorkItemExternalLinks(input.workItemId);
  const priorPr = existingLinks.find(
    (link) => link.provider === "github" && link.link_type === "pull_request",
  );
  if (priorPr) {
    return {
      ok: true,
      outcome: "success",
      summary: `Pull request already linked: ${priorPr.url}`,
    };
  }

  const product = await getProduct(input.productId);
  if (!product) {
    return {
      ok: false,
      outcome: "failure",
      summary: "Open PR failed: product not found.",
    };
  }

  const accessToken = await getOrganizationAccessToken(
    product.organization_id,
    "github",
  );

  const config = await getGithubConfigForProduct(input.productId);
  if (!config) {
    return {
      ok: false,
      outcome: "failure",
      summary:
        "Open PR failed: link a default GitHub repository for this product under Connectors → GitHub.",
    };
  }

  const head = githubHeadBranchName(
    config.headBranchPrefix,
    input.workItemId,
    input.title,
  );

  const prBody = [
    `## Consol work item`,
    "",
    input.body.trim() || "_No brief yet._",
    "",
    `---`,
    `Opened by Consol for work item \`${input.workItemId}\`.`,
  ].join("\n");

  try {
    const pull = await createGithubPullRequest({
      owner: config.owner,
      repo: config.repo,
      title: input.title,
      body: prBody,
      head,
      base: config.baseBranch,
      draft: true,
      accessToken,
      markerPath: ".consol/work-item.md",
      markerContent: [
        `# ${input.title}`,
        "",
        `Work item: ${input.workItemId}`,
        "",
        input.body.trim() || "_No brief yet._",
        "",
      ].join("\n"),
    });

    await addWorkItemExternalLink({
      workItemId: input.workItemId,
      provider: "github",
      linkType: "pull_request",
      externalId: String(pull.number),
      url: pull.htmlUrl,
      title: pull.title,
      metadata: {
        draft: pull.draft,
        head: pull.head,
        base: pull.base,
        dryRun: pull.dryRun,
        owner: config.owner,
        repo: config.repo,
      },
      createdBy: input.actorSub ?? "system",
    });

    const nextBody = [
      input.body.trim(),
      "",
      `---`,
      `### Pull request`,
      pull.dryRun
        ? `Dry-run draft PR [#${pull.number}](${pull.htmlUrl}) (\`${pull.head}\` → \`${pull.base}\`). Connect GitHub under Connectors to open a real PR.`
        : `Draft PR [#${pull.number}](${pull.htmlUrl}) (\`${pull.head}\` → \`${pull.base}\`).`,
    ]
      .join("\n")
      .trim();

    await updateWorkItem({
      itemId: input.workItemId,
      title: input.title,
      body: nextBody,
    });

    return {
      ok: true,
      outcome: "success",
      summary: pull.dryRun
        ? `Dry-run: would open draft PR #${pull.number} on ${config.owner}/${config.repo} (${pull.htmlUrl}).`
        : `Opened draft PR #${pull.number}: ${pull.htmlUrl}`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown GitHub error";
    return {
      ok: false,
      outcome: "failure",
      summary: `Open PR failed: ${message}`,
    };
  }
}
