import { parseDeliveryIntent } from "@/lib/delivery/start";
import type { FlowDefinition } from "@/lib/flows/types";
import { parseOwnerRepo } from "@/lib/integrations/local";
import type { TextModel } from "@/lib/models";
import { REPO_INPUT_KEY } from "@/lib/proposals/types";

export type InferredProposal = {
  flowKey: string;
  inputs: Record<string, string>;
};

const MAX_TITLE = 80;
const MAX_FIELD = 4000;

/**
 * Cheap gate before asking the model: only messages with a work verb can be
 * a request to start work. Keeps plain questions on the fast streaming path.
 */
const WORK_VERB =
  /\b(implement|build|ship|fix|add|create|make|start|kick\s*off|refactor|re-?design|design|analy[sz]e|investigate|research|write|update|remove|delete|change|migrate|improve|explore|launch|set\s*up|deliver|develop|rework|draft|plan)\b/i;

export function mightRequestWork(message: string): boolean {
  return WORK_VERB.test(message);
}

/** "owner/repo", or a bare repo name that matches a known repo; else "". */
export function normalizeRepo(value: unknown, knownRepos: string[]): string {
  if (typeof value !== "string") return "";
  const text = value.trim();
  if (!text) return "";
  const ref = parseOwnerRepo(text);
  if (ref) return `${ref.owner}/${ref.repo}`;
  const bare = text.toLowerCase();
  return (
    knownRepos.find((repo) => repo.split("/")[1]?.toLowerCase() === bare) ?? ""
  );
}

/** Keep only the flow's own input keys, as trimmed, bounded strings. */
export function sanitizeInputs(
  flow: FlowDefinition,
  raw: unknown,
  knownRepos: string[],
): Record<string, string> {
  const source =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const inputs: Record<string, string> = {};
  for (const field of flow.inputs) {
    const value = source[field.key];
    if (field.key === REPO_INPUT_KEY) {
      inputs[field.key] = normalizeRepo(value, knownRepos);
      continue;
    }
    let text = typeof value === "string" ? value.trim() : "";
    if (field.type === "select" && field.options?.length) {
      if (!field.options.some((option) => option.value === text)) text = "";
    }
    const limit = field.key === "title" ? MAX_TITLE : MAX_FIELD;
    inputs[field.key] = text.slice(0, limit);
  }
  return inputs;
}

/** Pull the first JSON object out of a model reply (tolerates code fences). */
export function parseProposalJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const value = JSON.parse(text.slice(start, end + 1)) as unknown;
    return value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** Turn the model's decision into a proposal, or null for "don't propose". */
export function proposalFromModelJson(
  json: Record<string, unknown> | null,
  flows: FlowDefinition[],
  knownRepos: string[],
): InferredProposal | null {
  if (!json || json.propose !== true) return null;
  const flow = flows.find((entry) => entry.key === json.flow);
  if (!flow) return null;
  const inputs = sanitizeInputs(flow, json.inputs, knownRepos);
  if (flow.inputs.some((field) => field.key === "title") && !inputs.title) {
    return null;
  }
  return { flowKey: flow.key, inputs };
}

function describeFlows(flows: FlowDefinition[]): string {
  return flows
    .map((flow) => {
      const fields = flow.inputs
        .map((field) => {
          const options = field.options?.length
            ? ` one of [${field.options.map((o) => o.value).join(", ")}]`
            : "";
          return `    - ${field.key} (${field.label}${options})${field.placeholder ? `: ${field.placeholder}` : ""}`;
        })
        .join("\n");
      return `- ${flow.key}: ${flow.name} — ${flow.description}\n  inputs:\n${fields}`;
    })
    .join("\n");
}

function systemPrompt(flows: FlowDefinition[], knownRepos: string[]): string {
  return [
    "You are the propose_work_item step of Forge, the coordinator in the Consol product factory.",
    "Decide whether the user's latest chat message asks Consol to START a piece of work that should run through one of the registered flows below.",
    "You only draft a proposal. The user reviews and confirms it; nothing starts without their click.",
    "",
    "Rules:",
    "- Propose only for actionable requests to do work, e.g. \"implement X\", \"fix the login bug in consol\", \"ship: add a footer link\", \"can you build X?\".",
    "- Do NOT propose for questions, discussion, opinions, status checks, or hypotheticals, e.g. \"how does X work?\", \"what do you think about implementing X?\", \"what needs my decision?\".",
    "- Pick the single best flow. Software changes to a code repository use software-delivery.",
    `- title: short imperative summary, at most ${MAX_TITLE} characters.`,
    "- Restate the user's intent in the main text input (goal, brief, opportunity, …), adding relevant context from the recent conversation.",
    "- Draft other required inputs (e.g. acceptance notes) from the request so the user has something to edit.",
    "- repo: owner/repo only when the user names it or clearly refers to one of the known repositories. Otherwise use an empty string. Never invent a repository.",
    "",
    "Registered flows:",
    describeFlows(flows),
    "",
    knownRepos.length
      ? `Known repositories: ${knownRepos.join(", ")}`
      : "Known repositories: none",
    "",
    "Reply with JSON only, no prose:",
    '{"propose": false}',
    "or",
    '{"propose": true, "flow": "<flow key>", "inputs": {"<input key>": "<value>", ...}}',
  ].join("\n");
}

function heuristicProposal(
  message: string,
  flows: FlowDefinition[],
  knownRepos: string[],
): InferredProposal | null {
  const intent = parseDeliveryIntent(message);
  if (!intent.wantsDelivery) return null;
  const flow = flows.find((entry) => entry.key === "software-delivery");
  if (!flow) return null;
  return {
    flowKey: flow.key,
    inputs: sanitizeInputs(
      flow,
      {
        title: intent.title,
        goal: intent.body,
        repo: intent.repo ?? "",
        acceptance: "",
      },
      knownRepos,
    ),
  };
}

/**
 * Infer a work proposal from a chat message. Uses the model when one is
 * configured and falls back to the "ship: …" heuristic otherwise (or when
 * the model call fails). Returns null when the message isn't a work request.
 */
export async function inferWorkProposal(input: {
  message: string;
  /** Recent thread, oldest first, for context. */
  history: { role: string; content: string }[];
  flows: FlowDefinition[];
  knownRepos: string[];
  model: TextModel | null;
}): Promise<InferredProposal | null> {
  const { message, flows, knownRepos, model } = input;
  if (!mightRequestWork(message)) return null;
  if (!model) return heuristicProposal(message, flows, knownRepos);

  const transcript = input.history
    .slice(-8)
    .map((turn) => `${turn.role}: ${turn.content.slice(0, 1200)}`)
    .join("\n");
  const prompt = [
    transcript ? `Recent conversation:\n${transcript}\n` : "",
    `Latest user message:\n${message}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const reply = await model.generate({
      system: systemPrompt(flows, knownRepos),
      prompt,
      effort: "low",
    });
    return proposalFromModelJson(parseProposalJson(reply), flows, knownRepos);
  } catch {
    return heuristicProposal(message, flows, knownRepos);
  }
}
