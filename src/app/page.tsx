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
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_55%_at_0%_-10%,rgb(214_255_58_/_0.35),transparent_55%),radial-gradient(ellipse_55%_45%_at_100%_0%,rgb(15_118_110_/_0.14),transparent_50%),linear-gradient(160deg,#f4f7f2_0%,#e8eee9_42%,#dfe8e3_100%)]"
        />
        <div
          aria-hidden
          className="landing-grain absolute inset-0 -z-10 opacity-[0.35]"
        />

        <div className="mx-auto flex w-full max-w-6xl shrink-0 flex-col gap-6 px-6 pb-4 pt-24 md:flex-row md:items-end md:justify-between md:gap-8 md:px-10 md:pb-5 md:pt-24">
          <div className="min-w-0 max-w-2xl">
            <p className="animate-rise font-[family-name:var(--font-display)] text-5xl font-semibold leading-[0.86] tracking-tight text-[var(--landing-ink)] md:text-7xl lg:text-[6.5rem]">
              Consol
            </p>
            <span
              aria-hidden
              className="landing-signal-bar mt-3 block h-2 w-24 bg-[var(--landing-signal)] md:mt-4 md:h-2.5 md:w-28"
            />
            <h1 className="animate-rise-delay mt-4 max-w-xl text-lg leading-snug text-[var(--landing-ink)] md:text-xl lg:text-2xl">
              Every team&apos;s lifecycle on one floor — with AI in the loop.
            </h1>
            <p className="animate-rise-delay-2 mt-2 max-w-lg text-sm leading-relaxed text-[var(--landing-quiet)] md:text-[15px]">
              Link product, delivery, design, and data so people and agents
              share the same board.
            </p>
            <div className="animate-rise-delay-2 mt-5 flex flex-wrap gap-3">
              <Link
                href="/app"
                className="rounded-md bg-[var(--landing-ink)] px-5 py-2.5 text-sm font-semibold text-[var(--landing-signal)] transition hover:brightness-110"
              >
                Enter your factory
              </Link>
              <a
                href="#how"
                className="rounded-md border border-[var(--landing-ink)]/20 bg-white/70 px-5 py-2.5 text-sm font-medium text-[var(--landing-ink)] transition hover:border-[var(--landing-ink)]/45"
              >
                See how it fits
              </a>
            </div>
          </div>

          <ul
            aria-hidden
            className="animate-rise-delay flex flex-wrap gap-x-4 gap-y-1 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight md:mb-1 md:flex-col md:items-end md:gap-1 md:text-4xl lg:text-5xl"
          >
            {["Product", "Build", "Design", "Data"].map((label, i) => (
              <li
                key={label}
                className="landing-stage-label text-[var(--landing-ink)]/25 md:text-[var(--landing-ink)]/[0.18]"
                style={{ animationDelay: `${0.18 + i * 0.07}s` }}
              >
                <span className={i === 1 ? "text-[var(--landing-signal-deep)]" : undefined}>
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mt-1 w-full flex-1">
          <LandingWorkspace />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[var(--landing-bg)] to-transparent md:h-20"
          />
        </div>
      </section>

      <section
        id="how"
        className="relative z-[2] mx-auto w-full max-w-5xl px-6 py-20 md:px-10 md:py-28"
      >
        <p className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-[0.16em] text-[var(--landing-signal-deep)]">
          HOW IT FITS
        </p>
        <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight md:text-5xl">
          One floor for many processes
        </h2>
        <p className="mt-4 max-w-2xl text-[var(--landing-quiet)] md:text-lg">
          Product work spans software, design, and analysis. Consol keeps those
          lifecycles linked so people and AI share the same board, brief, and
          thread.
        </p>
        <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {[
            {
              n: "01",
              title: "Shared products",
              copy: "Stand up a product workspace your whole company can see and contribute to.",
            },
            {
              n: "02",
              title: "Linked lifecycles",
              copy: "Attach PM, engineering, design, or data processes — each with typed stages.",
            },
            {
              n: "03",
              title: "AI in the loop",
              copy: "Ask Forge for next steps, briefs, or critiques scoped to the work in front of you.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="border-t-2 border-[var(--landing-ink)] pt-5"
            >
              <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-[var(--landing-signal-deep)]">
                {item.n}
              </p>
              <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--landing-quiet)] md:text-[15px]">
                {item.copy}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-[2] overflow-hidden bg-[var(--landing-ink)] text-[var(--landing-mist)]">
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 w-1/3 bg-[linear-gradient(110deg,transparent,rgb(214_255_58_/_0.12))]"
        />
        <div className="relative mx-auto w-full max-w-5xl px-6 py-20 md:px-10 md:py-24">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight md:text-5xl">
            Built for the whole product org
          </h2>
          <p className="mt-3 max-w-2xl text-[var(--landing-mist)]/70">
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
                className="border-t border-white/15 py-6 sm:pr-10"
              >
                <p className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[var(--landing-signal)]">
                  {item.role}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--landing-mist)]/70">
                  {item.detail}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        id="faq"
        className="relative z-[2] mx-auto w-full max-w-5xl px-6 py-20 md:px-10 md:py-28"
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
        <div className="mt-12">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group border-t border-[var(--landing-line)] py-5"
            >
              <summary className="cursor-pointer list-none font-medium tracking-tight marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-start justify-between gap-4">
                  <span>{faq.question}</span>
                  <span
                    aria-hidden
                    className="mt-0.5 text-[var(--landing-signal-deep)] transition group-open:rotate-45"
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

      <section className="relative z-[2] border-t border-[var(--landing-line)] bg-[var(--landing-signal)] px-6 py-20 md:px-10 md:py-24">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--landing-ink)] md:text-5xl">
              Open the factory floor
            </h2>
            <p className="mt-3 text-[var(--landing-ink)]/75">
              Create a product, link your lifecycles, and put AI on the same
              board as your team.
            </p>
          </div>
          <Link
            href="/app"
            className="inline-flex w-fit rounded-md bg-[var(--landing-ink)] px-5 py-2.5 text-sm font-semibold text-[var(--landing-signal)] transition hover:brightness-110"
          >
            Enter Consol
          </Link>
        </div>
      </section>

      <footer className="relative z-[2] border-t border-[var(--landing-line)] px-6 py-8 md:px-10">
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
