const fallbackUrl = "http://127.0.0.1:43123";

export const siteConfig = {
  name: "Consol",
  tagline: "Product factory for cross-functional teams",
  description:
    "Consol is the product factory where product, engineering, design, and data lifecycles share one board — with AI teammates in the loop.",
  keywords: [
    "product management software",
    "AI product workspace",
    "cross-functional collaboration",
    "software delivery workflow",
    "product lifecycle management",
    "AI teammates",
    "product factory",
  ],
} as const;

export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return fallbackUrl;
}
