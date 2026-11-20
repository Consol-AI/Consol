import Link from "next/link";
import { LandingFactoryScene } from "@/components/landing-factory-scene";
import { SiteHeader } from "@/components/site-header";
import { getViewer } from "@/lib/auth";
import { getSiteUrl, siteConfig } from "@/lib/site";

const faqs = [
  {
    question: "What is Consol?",
    answer:
      "Consol is a product factory: a shared workspace where product management, software delivery, design, and data analysis lifecycles run side by side, with AI teammates collaborating on the same board and briefs.",
  },
  {
    question: "Who is Consol for?",
    answer:
      "Cross-functional product teams that need one place for decisions, stage gates, and AI-assisted work — instead of scattering context across chats, docs, and issue trackers.",
  },
  {
    question: "How does AI work inside Consol?",
    answer:
      "Forge helps coordinate across the workspace, while specialist teammate agents can draft, critique, and advance work within a process. AI stays scoped to the product, process, or item in front of you.",
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

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteUrl,
    description: siteConfig.description,
    potentialAction: {
      "@type": "Action",
      name: "Open factory",
      target: `${siteUrl}/app`,
    },
  };

  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteConfig.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: siteConfig.description,
    url: siteUrl,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <main className="landing-root relative flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([websiteSchema, softwareSchema, faqSchema]),
        }}
      />

      <SiteHeader viewer={viewer} tone="on-dark" />

      <section className="relative isolate flex min-h-[100svh] flex-col justify-center overflow-hidden px-6 pb-14 pt-24 md:justify-end md:px-10 md:pb-20 md:pt-28">
        <div
          aria-hidden
          className="animate-drift absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_18%_18%,var(--landing-glow),transparent_42%),radial-gradient(ellipse_at_88%_8%,#1f5c48,transparent_38%),linear-gradient(158deg,var(--landing-deep),var(--landing-mid)_52%,#0a1f18)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-[0.35]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'%3E%3Cg fill='none' stroke='%23e8eef0' stroke-opacity='0.07'%3E%3Cpath d='M0 35h140M0 70h140M0 105h140M35 0v140M70 0v140M105 0v140'/%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />
        <div className="animate-pulse-line absolute inset-x-0 top-[38%] -z-10 h-px bg-gradient-to-r from-transparent via-[#7ee0b8]/45 to-transparent" />
        <LandingFactoryScene />

        <div className="relative mx-auto w-full max-w-5xl text-[var(--landing-mist)]">
          <p className="animate-rise font-[family-name:var(--font-display)] text-6xl font-semibold leading-[0.92] tracking-tight md:text-8xl lg:text-9xl">
            Consol
          </p>
          <h1 className="animate-rise-delay mt-6 max-w-2xl text-xl leading-snug text-[#c5d9d0] md:text-2xl">
            Every team&apos;s lifecycle on one floor — with AI in the loop.
          </h1>
          <p className="animate-rise-delay-2 mt-4 max-w-xl text-sm leading-relaxed text-[#8fa89e] md:text-base">
            Link PM, delivery, design, and data processes so people and agents
            share the same board.
          </p>
          <div className="animate-rise-delay-2 mt-9 flex flex-wrap gap-3">
            <Link
              href="/app"
              className="rounded-md bg-[var(--landing-mist)] px-5 py-2.5 text-sm font-medium text-[var(--landing-deep)] transition hover:bg-white"
            >
              Enter your factory
            </Link>
            <a
              href="#how"
              className="rounded-md border border-[#e8eef0]/30 px-5 py-2.5 text-sm text-[var(--landing-mist)] transition hover:border-[var(--landing-mist)]"
            >
              See how it fits
            </a>
          </div>
        </div>
      </section>

      <section
        id="how"
        className="mx-auto w-full max-w-5xl px-6 py-20 md:px-10 md:py-28"
      >
        <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight md:text-5xl">
          One floor for many processes
        </h2>
        <p className="mt-4 max-w-2xl text-[var(--landing-quiet)] md:text-lg">
          Product work spans software, design, and analysis. Consol keeps those
          lifecycles linked so people and AI share the same board, brief, and
          thread.
        </p>
        <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
          {[
            {
              title: "Shared products",
              copy: "Stand up a product workspace your whole company can see and contribute to — one source of truth for intent.",
            },
            {
              title: "Linked lifecycles",
              copy: "Attach PM, engineering, design, or data processes — each with typed stages for agents, humans, and scripts.",
            },
            {
              title: "AI in the loop",
              copy: "Ask Forge for next steps, briefs, or critiques scoped to the work in front of you — or spin up specialist teammates.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="border-t border-[var(--landing-line)] pt-5"
            >
              <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--landing-quiet)] md:text-[15px]">
                {item.copy}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--landing-line)] bg-[var(--landing-panel)]">
        <div className="mx-auto w-full max-w-5xl px-6 py-20 md:px-10 md:py-24">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight md:text-4xl">
            Built for the whole product org
          </h2>
          <p className="mt-3 max-w-2xl text-[var(--landing-quiet)]">
            Keep specialist workflows — without losing the shared narrative.
          </p>
          <ul className="mt-12 grid gap-0 sm:grid-cols-2">
            {[
              {
                role: "Product",
                detail: "Prioritize, brief, and gate decisions across linked streams.",
              },
              {
                role: "Engineering",
                detail: "Advance delivery stages with human approvals and agent assists.",
              },
              {
                role: "Design",
                detail: "Keep exploration and critique tied to the same product intent.",
              },
              {
                role: "Data",
                detail: "Run analysis flows beside the features they inform.",
              },
            ].map((item) => (
              <li
                key={item.role}
                className="border-t border-[var(--landing-line)] py-6 sm:pr-8"
              >
                <p className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
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
          className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight md:text-4xl"
        >
          Questions teams ask
        </h2>
        <p className="mt-3 max-w-2xl text-[var(--landing-quiet)]">
          How Consol fits a product org that wants shared context and AI in the
          loop.
        </p>
        <div className="mt-12 space-y-0">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group border-t border-[var(--landing-line)] py-5 open:pb-6"
            >
              <summary className="cursor-pointer list-none font-medium tracking-tight marker:content-none [&::-webkit-details-marker]:hidden">
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
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--landing-quiet)] md:text-[15px]">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden px-6 py-20 md:px-10 md:py-24">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[linear-gradient(160deg,var(--landing-deep),var(--landing-mid)_60%,#0d2a22)]"
        />
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl text-[var(--landing-mist)]">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight md:text-5xl">
              Open the factory floor
            </h2>
            <p className="mt-3 text-[#9cb8ae]">
              Create a product, link your lifecycles, and put AI on the same
              board as your team.
            </p>
          </div>
          <Link
            href="/app"
            className="inline-flex w-fit rounded-md bg-[var(--landing-mist)] px-5 py-2.5 text-sm font-medium text-[var(--landing-deep)] transition hover:bg-white"
          >
            Enter Consol
          </Link>
        </div>
      </section>

      <footer className="border-t border-[var(--landing-line)] px-6 py-8 md:px-10">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 text-sm text-[var(--landing-quiet)] sm:flex-row sm:items-center sm:justify-between">
          <p className="font-[family-name:var(--font-display)] font-semibold text-[var(--landing-ink)]">
            Consol
          </p>
          <p>Product factory for cross-functional teams.</p>
        </div>
      </footer>
    </main>
  );
}
