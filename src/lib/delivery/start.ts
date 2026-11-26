import { queueCurrentStage } from "@/lib/flows/runtime";
import {
  createWorkItem,
  ensureOrgProcess,
  listStages,
  type Process,
  type WorkItem,
} from "@/lib/factory";
import { workItemHref } from "@/lib/work-links";
import {
  parseOwnerRepo,
  resolveRepo,
  type ResolvedRepo,
} from "@/lib/integrations/local";

export type StartSoftwareDeliveryInput = {
  organizationId: string;
  actorSub: string;
  title: string;
  body?: string;
  /** "owner/repo"; defaults to CONSOL_GITHUB_REPO or the local git origin. */
  repo?: string;
  /** When true, run the Spec agent immediately after creating the item. */
  runSpec?: boolean;
};

export type StartSoftwareDeliveryResult = {
  process: Process;
  item: WorkItem;
  repo: ResolvedRepo;
  href: string;
  specSummary?: string;
};

export async function startSoftwareDelivery(
  input: StartSoftwareDeliveryInput,
): Promise<StartSoftwareDeliveryResult> {
  const title = input.title.trim();
  if (!title) throw new Error("A feature title is required");

  const repo = await resolveRepo(input.repo ? { repo: input.repo } : null);
  if (!repo) {
    throw new Error(
      "No GitHub repo found. Set CONSOL_GITHUB_REPO or run Consol from a git checkout with a GitHub origin.",
    );
  }
  const repoName = `${repo.owner}/${repo.repo}`;

  const process = await ensureOrgProcess({
    organizationId: input.organizationId,
    templateKey: "software-delivery",
    createdBy: input.actorSub,
  });

  const stages = await listStages(process.id);
  const entry =
    stages.find((s) => s.stage_key === "spec") ??
    stages.sort((a, b) => a.position - b.position)[0];
  if (!entry) throw new Error("Software delivery process has no stages");

  const body =
    input.body?.trim() ||
    [
      `## Feature request`,
      title,
      "",
      `Requested via Consol Forge chat.`,
      `Target repo: ${repoName}`,
    ].join("\n");

  let item = await createWorkItem({
    processId: process.id,
    stageId: entry.id,
    title,
    body,
    inputs: { title, repo: repoName },
    createdBy: input.actorSub,
  });

  let specSummary: string | undefined;
  if (input.runSpec !== false) {
    const result = await queueCurrentStage({
      itemId: item.id,
      actorSub: input.actorSub,
    });
    item = result.item;
    specSummary = result.summary;
  }

  return { process, item, repo, href: workItemHref(item), specSummary };
}

/** Heuristic: does this chat message ask to start a delivery / ship a feature? */
export function parseDeliveryIntent(message: string): {
  wantsDelivery: boolean;
  title: string;
  body: string;
  /** "owner/repo" when the message names one ("ship on acme/web: ..."). */
  repo?: string;
} {
  const raw = message.trim();
  const repoMatch = raw.match(/\b(?:on|in|for|to)\s+([\w.-]+\/[\w.-]+)\s*:?/i);
  const repoRef = repoMatch ? parseOwnerRepo(repoMatch[1]) : null;
  const repo = repoRef ? `${repoRef.owner}/${repoRef.repo}` : undefined;
  const text = repoMatch ? raw.replace(repoMatch[0], " ").replace(/\s+/g, " ").trim() : raw;
  const patterns = [
    /^(?:start|begin|kick\s*off|run)\s+(?:a\s+)?(?:software\s+)?(?:delivery|sdlc|flow)\s*(?:for|on)?\s*:?\s*(.+)$/i,
    /^(?:ship|build|implement)\b\s*:?\s*(?:(?:a\s+)?feature\b\s*:?\s*)?(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]?.trim()) {
      const title = match[1].trim().replace(/^["']|["']$/g, "");
      return {
        wantsDelivery: true,
        title: title.slice(0, 160),
        body: raw,
        repo,
      };
    }
  }

  return { wantsDelivery: false, title: "", body: text };
}
