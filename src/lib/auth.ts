import { headers } from "next/headers";
import { getIdentity } from "../../cursor/identity";

export type AppViewer = {
  sub: string;
  email: string;
  name: string;
  kind: "person" | "key";
};

export async function getViewer(): Promise<AppViewer | null> {
  const h = await headers();
  const identity = await getIdentity(h);
  if (!identity.verified) return null;
  if (identity.kind !== "person") return null;
  return {
    sub: identity.sub,
    email: identity.email,
    name: identity.name || identity.email || "Teammate",
    kind: identity.kind,
  };
}

export async function requireViewer(): Promise<AppViewer> {
  const viewer = await getViewer();
  if (!viewer) {
    throw new Error("UNAUTHORIZED");
  }
  return viewer;
}
