import type { TeammatePlaceHolder } from "@/components/workspace-dashboard";
import { listAgents } from "@/lib/agents";
import type { Member, Product } from "@/lib/factory";
import type { TeammateRecord } from "@/lib/teammates/types";

/** Humans from memberships + optional seed people + registry agent teammates. */
export function buildPlaceholderTeammates(input: {
  members: Member[];
  products: Product[];
  agents?: TeammateRecord[];
}): TeammatePlaceHolder[] {
  const productIds = input.products.map((p) => p.id);
  const first = productIds[0];
  const second = productIds[1];
  const third = productIds[2];

  const humans: TeammatePlaceHolder[] = input.members.map((m, index) => ({
    id: m.id,
    name: m.display_name || m.email || "Teammate",
    role: m.role === "admin" ? "Admin" : "Member",
    kind: "human" as const,
    status: (index === 0 ? "online" : index % 2 === 0 ? "away" : "busy") as
      | "online"
      | "away"
      | "busy",
    productIds:
      productIds.length === 0
        ? []
        : productIds.filter((_, i) => i % 2 === index % 2 || i === 0),
    email: m.email,
  }));

  const seedPool: TeammatePlaceHolder[] = [
    {
      id: "seed-maya",
      name: "Maya Chen",
      role: "Product",
      kind: "human",
      status: "online",
      productIds: [first, second].filter(Boolean) as string[],
    },
    {
      id: "seed-jordan",
      name: "Jordan Lee",
      role: "Engineering",
      kind: "human",
      status: "away",
      productIds: [first, third].filter(Boolean) as string[],
    },
  ];
  const seedHumans =
    humans.length >= 3
      ? []
      : seedPool.slice(0, Math.max(0, 3 - humans.length));

  const registered = input.agents ?? [];
  const agents: TeammatePlaceHolder[] =
    registered.length > 0
      ? registered.map((a) => ({
          id: a.id,
          name: a.name,
          role: a.role,
          kind: "agent" as const,
          status:
            a.status === "local"
              ? ("ready" as const)
              : a.status === "stopped"
                ? ("idle" as const)
                : ("ready" as const),
          productIds,
          slug: a.slug,
        }))
      : listAgents().map((agent, index) => ({
          id: `agent-${agent.key}`,
          name: agent.name,
          role: agent.role,
          kind: "agent" as const,
          status: (index === 1 ? "idle" : "ready") as "ready" | "idle",
          productIds:
            index === 0
              ? productIds
              : index === 1
                ? ([first, third].filter(Boolean) as string[])
                : ([second, first].filter(Boolean) as string[]),
          slug: agent.key,
        }));

  return [...humans, ...seedHumans, ...agents];
}
