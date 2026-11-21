export type ConnectorKey = "github" | "linear" | "slack";

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
    actions: ["OAuth account connect", "Open draft pull requests"],
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
