export type ProcessTemplate = {
  key: string;
  name: string;
  domain: string;
  description: string;
  stages: { name: string; description: string }[];
};

export const PROCESS_TEMPLATES: ProcessTemplate[] = [
  {
    key: "product-management",
    name: "Product management",
    domain: "product",
    description:
      "Discover opportunities, define bets, prioritize, validate, and launch.",
    stages: [
      { name: "Discover", description: "Problems, insights, and opportunities." },
      { name: "Define", description: "Problem framing and success criteria." },
      { name: "Prioritize", description: "Sequence bets and tradeoffs." },
      { name: "Validate", description: "Evidence from users and experiments." },
      { name: "Launch", description: "Ship, measure, and learn." },
    ],
  },
  {
    key: "software-delivery",
    name: "Software delivery",
    domain: "engineering",
    description: "Move work from spec through build, review, test, and ship.",
    stages: [
      { name: "Spec", description: "Technical approach and acceptance criteria." },
      { name: "Build", description: "Implementation in progress." },
      { name: "Review", description: "Code and design review." },
      { name: "Test", description: "QA, verification, and hardening." },
      { name: "Ship", description: "Release and monitor." },
    ],
  },
  {
    key: "design",
    name: "Design",
    domain: "design",
    description: "Brief, explore, critique, refine, and hand off.",
    stages: [
      { name: "Brief", description: "Goals, constraints, and audience." },
      { name: "Explore", description: "Directions and concepts." },
      { name: "Critique", description: "Feedback and decisions." },
      { name: "Refine", description: "Polish the chosen direction." },
      { name: "Handoff", description: "Specs ready for build." },
    ],
  },
  {
    key: "data-analysis",
    name: "Data analysis",
    domain: "data",
    description: "Frame a question, gather data, analyze, and decide.",
    stages: [
      { name: "Question", description: "What decision needs evidence?" },
      { name: "Gather", description: "Sources, extracts, and cleaning." },
      { name: "Analyze", description: "Models, charts, and findings." },
      { name: "Insight", description: "What the data says." },
      { name: "Decide", description: "Action and follow-up." },
    ],
  },
];

export function getTemplate(key: string): ProcessTemplate | undefined {
  return PROCESS_TEMPLATES.find((t) => t.key === key);
}
