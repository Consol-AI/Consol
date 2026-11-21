/** Public site metadata shared by the landing page, metadata routes, and JSON-LD. */

function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://127.0.0.1:43123";
}

export const site = {
  name: "Consol",
  url: resolveSiteUrl(),
  title: "Consol — The AI product factory for cross-functional teams",
  shortDescription:
    "One AI workspace for product, engineering, design, and data lifecycles.",
  description:
    "Consol is an AI product factory where product management, software delivery, design, and data analysis run as linked workflows — with AI teammates working alongside your people on the same board, brief, and thread.",
  keywords: [
    "AI product management",
    "AI workspace",
    "product factory",
    "AI teammates",
    "AI agents for teams",
    "software delivery workflow",
    "product lifecycle management",
    "cross-functional collaboration",
    "design workflow",
    "data analysis workflow",
  ],
} as const;
