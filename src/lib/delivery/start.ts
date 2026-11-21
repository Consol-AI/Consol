import { advanceWorkItem } from "@/lib/flows/runtime";
import {
  addProcessFromTemplate,
  createProduct,
  createWorkItem,
  listProcesses,
  listProducts,
  listStages,
  type Product,
  type Process,
  type WorkItem,
} from "@/lib/factory";
import { upsertGithubIntegration } from "@/lib/integrations";

export const LEAGUESPORTS_DEFAULT = {
  productName: "LeagueSports",
  productDescription: "LeagueSports product workspace managed by Consol.",
  owner: "leaguesports",
  repo: "landing-page",
  baseBranch: "main",
} as const;

export type StartSoftwareDeliveryInput = {
  organizationId: string;
  actorSub: string;
  title: string;
  body?: string;
  /** Prefer an existing product id when provided. */
  productId?: string;
  /** Bind/ensure GitHub repo for the product (defaults to leaguesports/landing-page). */
  github?: {
    owner: string;
    repo: string;
    baseBranch?: string;
  };
  /** When true, run the Spec agent immediately after creating the item. */
  runSpec?: boolean;
};

export type StartSoftwareDeliveryResult = {
  product: Product;
  process: Process;
  item: WorkItem;
  href: string;
  specSummary?: string;
};

export async function ensureLeagueSportsProduct(input: {
  organizationId: string;
  createdBy: string;
  productId?: string;
}): Promise<Product> {
  if (input.productId) {
    const products = await listProducts(input.organizationId);
    const found = products.find((p) => p.id === input.productId);
    if (found) return found;
  }

  const products = await listProducts(input.organizationId);
  const existing = products.find(
    (p) => p.name.toLowerCase() === LEAGUESPORTS_DEFAULT.productName.toLowerCase(),
  );
  if (existing) return existing;

  return createProduct({
    organizationId: input.organizationId,
    name: LEAGUESPORTS_DEFAULT.productName,
    description: LEAGUESPORTS_DEFAULT.productDescription,
    createdBy: input.createdBy,
  });
}

export async function ensureSoftwareDeliveryProcess(input: {
  productId: string;
  createdBy: string;
}): Promise<Process> {
  const processes = await listProcesses(input.productId);
  const candidates = processes.filter(
    (p) => p.template_key === "software-delivery",
  );
  for (const candidate of candidates) {
    const stages = await listStages(candidate.id);
    const keys = new Set(stages.map((s) => s.stage_key));
    // Prefer a process that already has the Cursor-era stage graph.
    if (
      keys.has("spec-approve") &&
      keys.has("build") &&
      keys.has("validate") &&
      keys.has("ship-approve") &&
      keys.has("merge")
    ) {
      return candidate;
    }
  }
  return addProcessFromTemplate({
    productId: input.productId,
    templateKey: "software-delivery",
    createdBy: input.createdBy,
  });
}

export async function startSoftwareDelivery(
  input: StartSoftwareDeliveryInput,
): Promise<StartSoftwareDeliveryResult> {
  const title = input.title.trim();
  if (!title) throw new Error("A feature title is required");

  const product = await ensureLeagueSportsProduct({
    organizationId: input.organizationId,
    createdBy: input.actorSub,
    productId: input.productId,
  });

  const github = input.github ?? {
    owner: LEAGUESPORTS_DEFAULT.owner,
    repo: LEAGUESPORTS_DEFAULT.repo,
    baseBranch: LEAGUESPORTS_DEFAULT.baseBranch,
  };

  await upsertGithubIntegration({
    productId: product.id,
    owner: github.owner,
    repo: github.repo,
    baseBranch: github.baseBranch ?? "main",
    headBranchPrefix: "consol/",
    createdBy: input.actorSub,
  });

  const process = await ensureSoftwareDeliveryProcess({
    productId: product.id,
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
      `Target repo: ${github.owner}/${github.repo}`,
    ].join("\n");

  let item = await createWorkItem({
    processId: process.id,
    stageId: entry.id,
    title,
    body,
    createdBy: input.actorSub,
  });

  let specSummary: string | undefined;
  if (input.runSpec !== false) {
    const result = await advanceWorkItem({
      itemId: item.id,
      outcome: "default",
      actorSub: input.actorSub,
      execute: true,
    });
    item = result.item;
    specSummary = result.summary;
  }

  const href = `/app/products/${product.id}/processes/${process.id}?item=${item.id}`;
  return { product, process, item, href, specSummary };
}

/** Heuristic: does this chat message ask to start a delivery / ship a feature? */
export function parseDeliveryIntent(message: string): {
  wantsDelivery: boolean;
  title: string;
  body: string;
} {
  const text = message.trim();
  const patterns = [
    /^(?:start|begin|kick\s*off|run)\s+(?:a\s+)?(?:software\s+)?(?:delivery|sdlc|flow)\s*(?:for|on)?\s*:?\s*(.+)$/i,
    /^(?:ship|build|implement|add)\s+(?:a\s+)?(?:feature\s+)?(?:on\s+leaguesports\s*:?\s*)?(.+)$/i,
    /^leaguesports\s*:\s*(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]?.trim()) {
      const title = match[1].trim().replace(/^["']|["']$/g, "");
      return {
        wantsDelivery: true,
        title: title.slice(0, 160),
        body: text,
      };
    }
  }

  const lowered = text.toLowerCase();
  if (
    (lowered.includes("leaguesports") || lowered.includes("league sports")) &&
    (lowered.includes("feature") ||
      lowered.includes("ship") ||
      lowered.includes("build") ||
      lowered.includes("delivery") ||
      lowered.includes("implement"))
  ) {
    const title =
      text
        .replace(/leaguesports/gi, "")
        .replace(/\b(please|can you|could you|i want to|let'?s)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 160) || "New LeagueSports feature";
    return { wantsDelivery: true, title, body: text };
  }

  return { wantsDelivery: false, title: "", body: text };
}
