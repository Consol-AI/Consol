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
      "Open draft pull requests from software delivery and link them back to work items.",
    category: "Source control",
    available: true,
    href: "/app/connectors/github",
    actions: ["Open draft pull requests", "Link PR URLs to work items"],
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
