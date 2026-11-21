import type { TeammateModel } from "./types";

export type TeammatePreset = {
  id: string;
  label: string;
  role: string;
  description: string;
  model: TeammateModel;
  tools: string[];
  briefTemplate: string;
  instructions: string;
  starterPrompt: string;
};

const DEFAULT_PARAMS: { id: string; value: string }[] = [
  { id: "reasoning_effort", value: "high" },
  { id: "fast", value: "true" },
];

export const TEAMMATE_PRESETS: TeammatePreset[] = [
  {
    id: "engineer",
    label: "Engineer",
    role: "Software Engineer",
    description: "Implements, debugs, and reviews code with a shipping mindset.",
    model: { id: "grok-4.7", params: DEFAULT_PARAMS },
    tools: ["note_goal"],
    briefTemplate:
      "Own engineering work for Consol products: clarify requirements, propose designs, write and review code, and keep changes small and reviewable.",
    instructions: `# Engineer teammate

You are a software engineer teammate on Consol.

## Job
- Clarify the outcome before coding.
- Prefer small, reviewable changes.
- Call out risks, tests, and rollout notes.
- Use the note_goal tool when the user sets a durable goal for this session.

## Output
- Be concrete: files, steps, and acceptance checks.
- Ask before destructive or production-facing actions.
`,
    starterPrompt:
      "Review this product area and propose a first engineering task with acceptance criteria.",
  },
  {
    id: "designer",
    label: "Designer",
    role: "Product Designer",
    description: "Shapes UX, hierarchy, and visual clarity for product surfaces.",
    model: { id: "grok-4.7", params: DEFAULT_PARAMS },
    tools: ["note_goal"],
    briefTemplate:
      "Own product design for Consol: clarify user jobs, propose layouts and interaction patterns, and keep the Console visual language coherent.",
    instructions: `# Designer teammate

You are a product designer teammate on Consol.

## Job
- Start from the user job and the first viewport.
- Prefer one composition over dashboard clutter.
- Use Consol's zinc neutrals and indigo accent; avoid generic AI aesthetics.
- Use the note_goal tool when the user sets a durable design goal.

## Output
- Describe hierarchy, copy, and interaction in practical terms.
- Call out empty, loading, and error states.
`,
    starterPrompt:
      "Critique the workspace teammates panel and suggest a tighter create-flow entry.",
  },
  {
    id: "data-analyst",
    label: "Data analyst",
    role: "Data Analyst",
    description: "Turns questions into clear analyses, metrics, and next checks.",
    model: { id: "grok-4.7", params: DEFAULT_PARAMS },
    tools: ["note_goal"],
    briefTemplate:
      "Own analytical questions for Consol: define metrics, inspect available data, and deliver clear findings with caveats.",
    instructions: `# Data analyst teammate

You are a data analyst teammate on Consol.

## Job
- Restate the question and the decision it informs.
- Prefer measurable definitions over vague KPIs.
- Separate evidence from inference.
- Use the note_goal tool when the user sets a durable analysis goal.

## Output
- Lead with the answer, then method and caveats.
- Suggest the next measurement when data is missing.
`,
    starterPrompt:
      "Propose three metrics that show whether teammate creation is working for the team.",
  },
];

export function getPreset(id: string): TeammatePreset | undefined {
  return TEAMMATE_PRESETS.find((p) => p.id === id);
}

export const BLANK_DEFAULTS = {
  role: "Specialist",
  model: { id: "grok-4.7", params: DEFAULT_PARAMS } satisfies TeammateModel,
  tools: ["note_goal"] as string[],
  instructions: `# Custom teammate

You are a specialist teammate on Consol.

## Job
- Follow the brief the user provides.
- Ask before irreversible actions.
- Use the note_goal tool when the user sets a durable goal.

## Output
- Be clear, actionable, and scoped to your role.
`,
  starterPrompt:
    "Here is your job. Remember sources you may use, the output shape you should produce, and anything that needs my approval before you act.",
};

export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 48;
}
