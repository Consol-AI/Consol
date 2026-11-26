import { updateWorkItem } from "@/lib/factory";
import {
  mergeGithubPullRequest,
  parseGithubPrUrl,
} from "@/lib/integrations/github/client";
import { getGithubToken } from "@/lib/integrations/local";
import { listWorkItemExternalLinks } from "@/lib/integrations";
import { sql } from "@/lib/db";
import type { ScriptRunInput, ScriptRunResult } from "@/lib/flows/scripts/types";

function prFromBody(body: string): string | null {
  const match = body.match(
    /https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+/i,
  );
  return match?.[0] ?? null;
}

/** Merge the linked GitHub pull request. */
export async function runMergePullRequest(
  input: ScriptRunInput,
): Promise<ScriptRunResult> {
  if (!input.workItemId) {
    return {
      ok: false,
      outcome: "failure",
      summary: "Merge failed: work item is required.",
    };
  }

  const links = await listWorkItemExternalLinks(input.workItemId);
  const prLink = links.find(
    (l) => l.provider === "github" && l.link_type === "pull_request",
  );
  const prUrl = prLink?.url || prFromBody(input.body);
  if (!prUrl) {
    return {
      ok: false,
      outcome: "failure",
      summary: "Merge failed: no linked GitHub pull request.",
    };
  }

  const parsed = parseGithubPrUrl(prUrl);
  if (!parsed) {
    return {
      ok: false,
      outcome: "failure",
      summary: `Merge failed: could not parse PR url ${prUrl}`,
    };
  }

  const token = await getGithubToken(input.organizationId);

  try {
    const result = await mergeGithubPullRequest({
      owner: parsed.owner,
      repo: parsed.repo,
      number: parsed.number,
      accessToken: token,
      mergeMethod: "squash",
      commitTitle: input.title,
    });

    if (!result.merged) {
      return {
        ok: false,
        outcome: "failure",
        summary: result.message || "GitHub did not merge the pull request.",
      };
    }

    if (prLink) {
      await sql(
        `update work_item_external_links
         set metadata = coalesce(metadata, '{}'::jsonb) || $1::jsonb
         where id = $2`,
        [
          JSON.stringify({
            merged: true,
            mergeSha: result.sha ?? "",
            dryRun: result.dryRun,
            mergedAt: new Date().toISOString(),
          }),
          prLink.id,
        ],
      );
    }

    if (!input.body.includes("Merged:")) {
      const nextBody = [
        input.body.trim(),
        "",
        "---",
        `### Merged`,
        result.dryRun
          ? `Dry-run merge of ${prUrl}`
          : `Merged ${prUrl}${result.sha ? ` @ ${result.sha.slice(0, 7)}` : ""}`,
      ]
        .join("\n")
        .trim();
      await updateWorkItem({
        itemId: input.workItemId,
        title: input.title,
        body: nextBody,
      });
    }

    return {
      ok: true,
      outcome: "success",
      summary: result.dryRun
        ? `Dry-run merged PR #${parsed.number}`
        : `Merged PR #${parsed.number}: ${result.message}`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown GitHub error";
    return {
      ok: false,
      outcome: "failure",
      summary: `Merge failed: ${message}`,
    };
  }
}
