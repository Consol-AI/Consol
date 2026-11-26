export type ConnectorKey = "github" | "cursor" | "models" | "linear" | "slack";

export type ConnectorDefinition = {
  key: ConnectorKey;
  name: string;
  description: string;
  category: string;
  /** When false, shown as coming soon. */
  available: boolean;
  href: string;
  actions: string[];
};

export const CONNECTOR_DEFINITIONS: ConnectorDefinition[] = [
  {
    key: "github",
    name: "GitHub",
    description:
      "Connect a GitHub account with OAuth, then open draft pull requests from software delivery.",
    category: "Source control",
    available: true,
    href: "/app/connectors/github",
    actions: ["OAuth account connect", "Open draft pull requests", "Merge PRs"],
  },
  {
    key: "cursor",
    name: "Cursor",
    description:
      "Store a Cursor API key so Cloud Agents can implement approved specs against your GitHub repos.",
    category: "Coding agents",
    available: true,
    href: "/app/connectors/cursor",
    actions: ["API key", "Launch Cloud Agents", "Open PRs"],
  },
  {
    key: "models",
    name: "Models",
    description:
      "Choose the primary text model and see the failover chain used when Claude hits rate limits.",
    category: "AI providers",
    available: true,
    href: "/app/connectors/models",
    actions: ["Switch provider", "Rate-limit failover", "CONSOL_MODEL"],
  },
  {
    key: "linear",
    name: "Linear",
    description:
      "Sync issues and status with Linear for product and engineering handoffs.",
    category: "Issue tracking",
    available: false,
    href: "/app/connectors/linear",
    actions: ["Create issues", "Mirror status"],
  },
  {
    key: "slack",
    name: "Slack",
    description:
      "Notify channels when human gates need attention or a flow stage completes.",
    category: "Messaging",
    available: false,
    href: "/app/connectors/slack",
    actions: ["Stage notifications", "Approval reminders"],
  },
];

export function listConnectors(): ConnectorDefinition[] {
  return CONNECTOR_DEFINITIONS;
}

export function getConnector(key: string): ConnectorDefinition | undefined {
  return CONNECTOR_DEFINITIONS.find((c) => c.key === key);
}
