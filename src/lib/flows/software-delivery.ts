import type { FlowDefinition } from "@/lib/flows/types";

export const softwareDeliveryFlow: FlowDefinition = {
  key: "software-delivery",
  name: "Software delivery",
  domain: "engineering",
  description:
    "Directed graph from spec through build, open PR, review, test, and ship — with reject and test-failure loops.",
  entry: "spec",
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
      id: "build",
      type: "agent",
      name: "Build",
      description: "Implementation in progress.",
      agentKey: "forge",
      rolePrompt:
        "You are the Build agent. Turn the approved spec into an implementation plan and concrete change list. Call out files, risks, and verification steps.",
      allowedTools: ["read_work_item", "update_brief", "list_stages"],
    },
    {
      id: "open-pr",
      type: "script",
      name: "Open PR",
      description: "Open a draft GitHub pull request for review.",
      path: "open-pr",
    },
    {
      id: "review",
      type: "human",
      name: "Review",
      description: "Code and design review.",
      responsible: "Engineering reviewer",
      approves: "Design and implementation are ready for test",
    },
    {
      id: "test",
      type: "script",
      name: "Test",
      description: "QA, verification, and hardening.",
      path: "verify-delivery",
    },
    {
      id: "ship",
      type: "human",
      name: "Ship",
      description: "Release and monitor.",
      responsible: "Release owner",
      approves: "Ready to release to production",
    },
  ],
  transitions: {
    spec: "build",
    build: "open-pr",
    "open-pr": [
      { next: "review", when: "success" },
      { next: "build", when: "failure" },
    ],
    review: [
      { next: "test", when: "approve" },
      { next: "build", when: "reject" },
    ],
    test: [
      { next: "ship", when: "success" },
      { next: "build", when: "failure" },
    ],
    ship: [
      { next: "done", when: "approve" },
      { next: "review", when: "reject" },
    ],
  },
};
