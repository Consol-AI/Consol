import { getProduct } from "@/lib/factory";
import {
  getGithubCheckSummary,
  getGithubPullRequestFromUrl,
  parseGithubPrUrl,
} from "@/lib/integrations/github/client";
import { getOrganizationAccessToken } from "@/lib/integrations/connections";
import { listWorkItemExternalLinks } from "@/lib/integrations";
import type { ScriptRunInput, ScriptRunResult } from "@/lib/flows/scripts/types";

function prFromBody(body: string): string | null {
  const match = body.match(
    /https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+/i,
  );
  return match?.[0] ?? null;
}

/** Validate GitHub Checks for the linked pull request. */
export async function runValidatePrChecks(
  input: ScriptRunInput,
): Promise<ScriptRunResult> {
  if (!input.productId || !input.workItemId) {
    return {
      ok: false,
      outcome: "failure",
      summary: "Validate failed: product and work item are required.",
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
      summary: "Validate failed: no linked GitHub pull request on this work item.",
    };
  }

  const product = await getProduct(input.productId);
  if (!product) {
    return {
      ok: false,
      outcome: "failure",
      summary: "Validate failed: product not found.",
    };
  }

  const token = await getOrganizationAccessToken(
    product.organization_id,
    "github",
  );

  const parsed = parseGithubPrUrl(prUrl);
  if (!parsed) {
    return {
      ok: false,
      outcome: "failure",
      summary: `Validate failed: could not parse PR url ${prUrl}`,
    };
  }

  try {
    const pull = await getGithubPullRequestFromUrl({
      prUrl,
      accessToken: token,
    });
    if (!pull) {
      return {
        ok: false,
        outcome: "failure",
        summary: "Validate failed: pull request not found.",
      };
    }

    if (pull.merged) {
      return {
        ok: true,
        outcome: "success",
        summary: `PR #${pull.number} is already merged.`,
      };
    }

    const checks = await getGithubCheckSummary({
      owner: parsed.owner,
      repo: parsed.repo,
      ref: pull.headSha,
      accessToken: token,
    });

    if (checks.state === "pending") {
      return {
        ok: true,
        outcome: "pending",
        summary: checks.summary,
      };
    }
    if (checks.state === "failure") {
      return {
        ok: false,
        outcome: "failure",
        summary: checks.summary,
      };
    }
    return {
      ok: true,
      outcome: "success",
      summary: checks.summary,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown GitHub error";
    return {
      ok: false,
      outcome: "failure",
      summary: `Validate failed: ${message}`,
    };
  }
}
