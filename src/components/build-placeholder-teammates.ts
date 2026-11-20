import type { TeammatePlaceHolder } from "@/components/workspace-dashboard";
import { listAgents } from "@/lib/agents";
import type { Member, Product } from "@/lib/factory";

/** Placeholder mix of humans + AI agents for dashboard exploration. */
export function buildPlaceholderTeammates(input: {
  members: Member[];
  products: Product[];
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

  // Seed a couple of fictional humans so the mix reads clearly with a solo org.
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

  const agents: TeammatePlaceHolder[] = listAgents().map((agent, index) => ({
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
  }));

  return [...humans, ...seedHumans, ...agents];
}
