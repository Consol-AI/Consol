import { cache } from "react";
import { headers } from "next/headers";
import { getIdentity } from "../../cursor/identity";

export type AppViewer = {
  sub: string;
  email: string;
  name: string;
  kind: "person" | "key";
  demo?: boolean;
};

const DEMO_VIEWER: AppViewer = {
  sub: "user:demo",
  email: "demo@consol.app",
  name: "Demo Teammate",
  kind: "person",
  demo: true,
};

/** Per-request memo so layout + page share one identity lookup. */
export const getViewer = cache(async (): Promise<AppViewer | null> => {
  const h = await headers();
  const identity = await getIdentity(h);
  if (identity.verified && identity.kind === "person") {
    return {
      sub: identity.sub,
      email: identity.email,
      name: identity.name || identity.email || "Teammate",
      kind: identity.kind,
    };
  }

  // Vercel / public previews have no Cursor identity header. Keep the factory
  // usable with a clearly labeled demo teammate until real auth is wired.
  if (process.env.VERCEL || process.env.CONSOL_DEMO_AUTH === "1") {
    return DEMO_VIEWER;
  }

  return null;
});

/** Viewer for a Route Handler request (same rules as `getViewer`). */
export async function getRequestViewer(
  request: Request,
): Promise<{ sub: string; name: string } | null> {
  const identity = await getIdentity(request);
  if (identity.verified && identity.kind === "person") {
    return {
      sub: identity.sub,
      name: identity.name || identity.email || "Teammate",
    };
  }
  if (process.env.VERCEL || process.env.CONSOL_DEMO_AUTH === "1") {
    return { sub: DEMO_VIEWER.sub, name: DEMO_VIEWER.name };
  }
  return null;
}

export async function requireViewer(): Promise<AppViewer> {
  const viewer = await getViewer();
  if (!viewer) {
    throw new Error("UNAUTHORIZED");
  }
  return viewer;
}
