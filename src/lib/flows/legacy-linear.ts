import type { FlowDefinition, FlowInputField, FlowStage } from "@/lib/flows/types";

/** Wrap a linear stage list as agent stages with simple forward transitions. */
export function linearFlow(input: {
  key: string;
  name: string;
  domain: string;
  description: string;
  stages: { id: string; name: string; description: string }[];
  inputs?: FlowInputField[];
}): FlowDefinition {
  const stages: FlowStage[] = input.stages.map((stage) => ({
    id: stage.id,
    type: "agent" as const,
    name: stage.name,
    description: stage.description,
    agentKey: "forge",
    rolePrompt: `You are assisting with the ${stage.name} stage in ${input.name}. Be concrete and actionable.`,
    allowedTools: ["read_work_item", "update_brief", "list_stages"],
  }));

  const transitions: FlowDefinition["transitions"] = {};
  for (let i = 0; i < input.stages.length; i += 1) {
    const current = input.stages[i]!;
    const next = input.stages[i + 1];
    transitions[current.id] = next ? next.id : "done";
  }

  return {
    key: input.key,
    name: input.name,
    domain: input.domain,
    description: input.description,
    entry: input.stages[0]!.id,
    stages,
    transitions,
    inputs: input.inputs ?? [
      {
        key: "title",
        label: "Title",
        type: "string",
        required: true,
        placeholder: "What should this flow deliver?",
      },
      {
        key: "brief",
        label: "Brief",
        type: "text",
        required: true,
        placeholder: "Context, constraints, and desired outcome",
      },
    ],
  };
}

export const designFlow = linearFlow({
  key: "design",
  name: "Design",
  domain: "design",
  description: "Brief, explore, critique, refine, and hand off.",
  inputs: [
    {
      key: "title",
      label: "Title",
      type: "string",
      required: true,
      placeholder: "What are we designing?",
    },
    {
      key: "audience",
      label: "Audience",
      type: "string",
      required: true,
      placeholder: "Who is this for?",
    },
    {
      key: "constraints",
      label: "Constraints",
      type: "text",
      required: true,
      placeholder: "Brand, platform, timeline, must-haves",
    },
    {
      key: "success",
      label: "Success look like",
      type: "text",
      required: false,
      placeholder: "What good handoff means",
    },
  ],
  stages: [
    { id: "brief", name: "Brief", description: "Goals, constraints, and audience." },
    { id: "explore", name: "Explore", description: "Directions and concepts." },
    { id: "critique", name: "Critique", description: "Feedback and decisions." },
    { id: "refine", name: "Refine", description: "Polish the chosen direction." },
    { id: "handoff", name: "Handoff", description: "Specs ready for build." },
  ],
});

export const dataAnalysisFlow = linearFlow({
  key: "data-analysis",
  name: "Data analysis",
  domain: "data",
  description: "Frame a question, gather data, analyze, and decide.",
  inputs: [
    {
      key: "title",
      label: "Title",
      type: "string",
      required: true,
      placeholder: "Name this analysis",
    },
    {
      key: "question",
      label: "Decision question",
      type: "text",
      required: true,
      placeholder: "What decision needs evidence?",
    },
    {
      key: "data_sources",
      label: "Data sources",
      type: "text",
      required: true,
      placeholder: "Tables, dashboards, exports to use",
    },
    {
      key: "timeframe",
      label: "Timeframe",
      type: "string",
      required: false,
      placeholder: "e.g. last 90 days",
    },
  ],
  stages: [
    { id: "question", name: "Question", description: "What decision needs evidence?" },
    { id: "gather", name: "Gather", description: "Sources, extracts, and cleaning." },
    { id: "analyze", name: "Analyze", description: "Models, charts, and findings." },
    { id: "insight", name: "Insight", description: "What the data says." },
    { id: "decide", name: "Decide", description: "Action and follow-up." },
  ],
});
