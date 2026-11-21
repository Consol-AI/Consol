import type { FlowDefinition } from "@/lib/flows/types";

export const softwareDeliveryFlow: FlowDefinition = {
  key: "software-delivery",
  name: "Software delivery",
  domain: "engineering",
  description:
    "Spec, approve, Cursor Cloud Agent build, validate checks, approve, and merge — with reject loops back to build.",
  entry: "spec",
  inputs: [
    {
      key: "title",
      label: "Title",
      type: "string",
      required: true,
      placeholder: "What are we shipping?",
    },
    {
      key: "goal",
      label: "Goal",
      type: "text",
      required: true,
      placeholder: "User-facing outcome and why it matters",
    },
    {
      key: "repo_context",
      label: "Repo / area",
      type: "string",
      required: false,
      placeholder: "owner/repo or package path",
    },
    {
      key: "acceptance",
      label: "Acceptance notes",
      type: "text",
      required: true,
      placeholder: "How we know this is done",
    },
  ],
  stages: [
    {
      id: "spec",
      type: "agent",
      name: "Spec",
      description: "Technical approach and acceptance criteria.",
      agentKey: "forge",
      rolePrompt:
        "You are the Spec agent for software delivery. Produce a concise technical approach, acceptance criteria, and open questions. Do not write implementation code yet.",
      allowedTools: ["read_work_item", "update_brief", "list_stages"],
    },
    {
      id: "spec-approve",
      type: "human",
      name: "Approve spec",
      description: "Human gate before coding starts.",
      responsible: "Product / engineering lead",
      approves: "Spec is clear enough to build",
    },
    {
      id: "build",
      type: "script",
      name: "Build",
      description: "Cursor Cloud Agent implements the change and opens a PR.",
      path: "cursor-build",
    },
    {
      id: "validate",
      type: "script",
      name: "Validate",
      description: "GitHub Checks on the pull request head.",
      path: "validate-pr-checks",
    },
    {
      id: "ship-approve",
      type: "human",
      name: "Approve ship",
      description: "Final human gate before merge.",
      responsible: "Release owner",
      approves: "Ready to merge the pull request",
    },
    {
      id: "merge",
      type: "script",
      name: "Merge",
      description: "Merge the linked GitHub pull request.",
      path: "merge-pr",
    },
  ],
  transitions: {
    spec: "spec-approve",
    "spec-approve": [
      { next: "build", when: "approve" },
      { next: "spec", when: "reject" },
    ],
    build: [
      { next: "validate", when: "success" },
      { next: "build", when: "failure" },
    ],
    validate: [
      { next: "ship-approve", when: "success" },
      { next: "build", when: "failure" },
    ],
    "ship-approve": [
      { next: "merge", when: "approve" },
      { next: "build", when: "reject" },
    ],
    merge: [
      { next: "done", when: "success" },
      { next: "ship-approve", when: "failure" },
    ],
  },
};
