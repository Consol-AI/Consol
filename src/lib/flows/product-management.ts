import type { FlowDefinition } from "@/lib/flows/types";

export const productManagementFlow: FlowDefinition = {
  key: "product-management",
  name: "Product management",
  domain: "product",
  description:
    "Discover opportunities, define bets, prioritize, validate, and launch — with human gates and research agents.",
  entry: "discover",
  inputs: [
    {
      key: "title",
      label: "Title",
      type: "string",
      required: true,
      placeholder: "Name this bet or opportunity",
    },
    {
      key: "opportunity",
      label: "Opportunity",
      type: "text",
      required: true,
      placeholder: "Problem or insight to explore",
    },
    {
      key: "audience",
      label: "Audience",
      type: "string",
      required: true,
      placeholder: "Who feels this pain?",
    },
    {
      key: "success_metric",
      label: "Success metric",
      type: "string",
      required: true,
      placeholder: "How we measure success",
    },
  ],
  stages: [
    {
      id: "discover",
      type: "agent",
      name: "Discover",
      description: "Problems, insights, and opportunities.",
      agentKey: "scout",
      rolePrompt:
        "You are the Discover agent for product management. Surface problems, insights, and opportunity hypotheses with evidence to gather next.",
      allowedTools: ["read_work_item", "search_context", "list_stages"],
    },
    {
      id: "define",
      type: "agent",
      name: "Define",
      description: "Problem framing and success criteria.",
      agentKey: "forge",
      rolePrompt:
        "You are the Define agent. Frame the problem, success metrics, and a crisp product bet statement.",
      allowedTools: ["read_work_item", "update_brief"],
    },
    {
      id: "prioritize",
      type: "human",
      name: "Prioritize",
      description: "Sequence bets and tradeoffs.",
      responsible: "Product lead",
      approves: "This bet is sequenced and worth validating",
    },
    {
      id: "validate",
      type: "script",
      name: "Validate",
      description: "Evidence from users and experiments.",
      path: "validate-evidence",
    },
    {
      id: "launch",
      type: "human",
      name: "Launch",
      description: "Ship, measure, and learn.",
      responsible: "Product lead",
      approves: "Ready to launch and measure",
    },
  ],
  transitions: {
    discover: "define",
    define: "prioritize",
    prioritize: [
      { next: "validate", when: "approve" },
      { next: "define", when: "reject" },
    ],
    validate: [
      { next: "launch", when: "success" },
      { next: "discover", when: "failure" },
    ],
    launch: [
      { next: "done", when: "approve" },
      { next: "prioritize", when: "reject" },
    ],
  },
};
