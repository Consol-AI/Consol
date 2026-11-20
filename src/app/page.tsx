import Link from "next/link";
import { LandingWorkspace } from "@/components/landing-workspace";
import { SiteHeader } from "@/components/site-header";
import { getViewer } from "@/lib/auth";
import { getSiteUrl, siteConfig } from "@/lib/site";

const faqs = [
  {
    question: "What is Consol?",
    answer:
      "Consol is a product factory: a shared workspace where product management, software delivery, design, and data analysis lifecycles run side by side, with AI teammates on the same board and briefs.",
  },
  {
    question: "Who is Consol for?",
    answer:
      "Cross-functional product teams that need one place for decisions, stage gates, and AI-assisted work instead of scattering context across chats, docs, and trackers.",
  },
  {
    question: "How does AI work inside Consol?",
    answer:
      "Forge coordinates across the workspace. Specialist teammate agents can draft, critique, and advance work inside a process — always scoped to the product, process, or item in front of you.",
  },
  {
    question: "Can different teams keep their own workflows?",
    answer:
      "Yes. Attach process templates for PM, engineering, design, or data analysis — each with its own stages — while keeping everything linked under one product.",
  },
] as const;

export default async function HomePage() {
  const viewer = await getViewer();
  const siteUrl = getSiteUrl();

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteUrl,
      description: siteConfig.description,
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: siteConfig.name,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: siteConfig.description,
      url: siteUrl,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ];

  return (
    <main className="landing-root relative flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SiteHeader viewer={viewer} />

      <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_85%_55%_at_8%_-8%,rgb(47_107_79_/_0.14),transparent_52%),radial-gradient(ellipse_55%_40%_at_100%_0%,rgb(15_118_110_/_0.08),transparent_48%),linear-gradient(180deg,#f8faf9_0%,#f4f6f5_50%,#eef2f0_100%)]"
        />

        <div className="mx-auto w-full max-w-5xl shrink-0 px-6 pb-8 pt-28 md:px-10 md:pb-10 md:pt-32">
          <p className="animate-rise font-[family-name:var(--font-display)] text-5xl font-semibold leading-[0.92] tracking-tight text-[var(--landing-ink)] md:text-7xl lg:text-8xl">
            Consol
          </p>
          <h1 className="animate-rise-delay mt-5 max-w-xl text-xl leading-snug text-[var(--landing-ink)]/85 md:text-2xl">
            Every team&apos;s lifecycle on one floor — with AI in the loop.
          </h1>
          <p className="animate-rise-delay-2 mt-3 max-w-lg text-[15px] leading-relaxed text-[var(--landing-quiet)]">
            Link product, delivery, design, and data so people and agents share
            the same board.
          </p>
          <div className="animate-rise-delay-2 mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/app"
              className="rounded-md bg-[var(--landing-ink)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--landing-ink)]/90"
            >
              Enter your factory
            </Link>
            <a
              href="#how"
              className="rounded-md px-5 py-2.5 text-sm font-medium text-[var(--landing-quiet)] transition hover:text-[var(--landing-ink)]"
            >
              See how it fits
            </a>
          </div>
        </div>

        <div className="relative w-full flex-1">
          <LandingWorkspace />
        </div>
      </section>

      <section
        id="how"
        className="mx-auto w-full max-w-5xl px-6 py-20 md:px-10 md:py-28"
      >
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--landing-ink)] md:text-4xl">
          One floor for many processes
        </h2>
        <p className="mt-4 max-w-2xl text-[var(--landing-quiet)] md:text-lg">
          Product work spans software, design, and analysis. Consol keeps those
          lifecycles linked so people and AI share the same board, brief, and
          thread.
        </p>
        <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-12">
          {[
            {
              title: "Shared products",
              copy: "Stand up a product workspace your whole company can see and contribute to.",
            },
            {
              title: "Linked lifecycles",
              copy: "Attach PM, engineering, design, or data processes — each with typed stages.",
            },
            {
              title: "AI in the loop",
              copy: "Ask Forge for next steps, briefs, or critiques scoped to the work in front of you.",
            },
          ].map((item) => (
            <div key={item.title} className="border-t border-[var(--landing-line)] pt-5">
              <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--landing-ink)]">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--landing-quiet)]">
                {item.copy}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--landing-line)] bg-[var(--landing-soft)]">
        <div className="mx-auto w-full max-w-5xl px-6 py-20 md:px-10 md:py-24">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--landing-ink)] md:text-4xl">
            Built for the whole product org
          </h2>
          <p className="mt-3 max-w-2xl text-[var(--landing-quiet)]">
            Keep specialist workflows without losing the shared narrative.
          </p>
          <ul className="mt-12 grid sm:grid-cols-2">
            {[
              {
                role: "Product",
                detail:
                  "Prioritize, brief, and gate decisions across linked streams.",
              },
              {
                role: "Engineering",
                detail:
                  "Advance delivery stages with human approvals and agent assists.",
              },
              {
                role: "Design",
                detail:
                  "Keep exploration and critique tied to the same product intent.",
              },
              {
                role: "Data",
                detail: "Run analysis flows beside the features they inform.",
              },
            ].map((item) => (
              <li
                key={item.role}
                className="border-t border-[var(--landing-line)] py-6 sm:pr-10"
              >
                <p className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--landing-ink)]">
                  {item.role}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--landing-quiet)]">
                  {item.detail}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        id="faq"
        className="mx-auto w-full max-w-5xl px-6 py-20 md:px-10 md:py-28"
        aria-labelledby="faq-heading"
      >
        <h2
          id="faq-heading"
          className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--landing-ink)] md:text-4xl"
        >
          Questions teams ask
        </h2>
        <p className="mt-3 max-w-2xl text-[var(--landing-quiet)]">
          How Consol fits a product org that wants shared context and AI in the
          loop.
        </p>
        <div className="mt-12">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group border-t border-[var(--landing-line)] py-5"
            >
              <summary className="cursor-pointer list-none font-medium tracking-tight text-[var(--landing-ink)] marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-start justify-between gap-4">
                  <span>{faq.question}</span>
                  <span
                    aria-hidden
                    className="mt-0.5 text-[var(--landing-quiet)] transition group-open:rotate-45"
                  >
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--landing-quiet)]">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className="border-t border-[var(--landing-line)] px-6 py-20 md:px-10 md:py-24">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--landing-ink)] md:text-4xl">
              Open the factory floor
            </h2>
            <p className="mt-3 text-[var(--landing-quiet)]">
              Create a product, link your lifecycles, and put AI on the same
              board as your team.
            </p>
          </div>
          <Link
            href="/app"
            className="inline-flex w-fit rounded-md bg-[var(--landing-ink)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--landing-ink)]/90"
          >
            Enter Consol
          </Link>
        </div>
      </section>

      <footer className="border-t border-[var(--landing-line)] px-6 py-8 md:px-10">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 text-sm text-[var(--landing-quiet)] sm:flex-row sm:items-center sm:justify-between">
          <p className="font-[family-name:var(--font-display)] font-semibold text-[var(--landing-ink)]">
            Consol
          </p>
          <p>Product factory for cross-functional teams.</p>
        </div>
      </footer>
    </main>
  );
}
