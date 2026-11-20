import Link from "next/link";
import { LandingWorkspace } from "@/components/landing-workspace";
import { SiteHeader } from "@/components/site-header";
import { getViewer } from "@/lib/auth";
import { getSiteUrl, siteConfig } from "@/lib/site";

const faqs = [
  {
    question: "Do I need to replace my issue tracker?",
    answer:
      "No. Consol is the shared floor for product decisions and linked lifecycles — with AI in the loop. Keep your trackers where they help; bring the work that needs coordination here.",
  },
  {
    question: "How long until my team can use it?",
    answer:
      "Open Consol, create a product, and attach a process template. Most teams are coordinating on the first board in minutes — no setup project required.",
  },
  {
    question: "What does the AI actually do?",
    answer:
      "Forge helps prioritize, brief, and surface decisions across your workspace. Specialist teammates can draft, critique, and advance stages — always scoped to the product or item in front of you.",
  },
  {
    question: "Can each team keep its own workflow?",
    answer:
      "Yes. Product, engineering, design, and data can each run their own stages while staying linked under one product — so context never forks.",
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

      {/* Hero — brand, offer, CTA, product proof */}
      <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_90%_55%_at_10%_-15%,rgb(15_118_110_/_0.12),transparent_50%),radial-gradient(ellipse_50%_35%_at_90%_0%,rgb(20_36_28_/_0.05),transparent_45%),linear-gradient(180deg,#fafbfb_0%,#f4f6f5_48%,#eef2f0_100%)]"
        />

        <div className="mx-auto w-full max-w-5xl shrink-0 px-6 pb-6 pt-24 md:px-10 md:pb-8 md:pt-28">
          <p className="animate-rise font-[family-name:var(--font-display)] text-5xl font-semibold leading-[0.9] tracking-tight text-[var(--landing-ink)] md:text-7xl lg:text-[5.75rem]">
            Consol
          </p>
          <span
            aria-hidden
            className="animate-rise-delay mt-4 block h-1 w-14 rounded-sm bg-[var(--landing-accent)]"
          />
          <h1 className="animate-rise-delay mt-5 max-w-2xl text-xl font-medium leading-snug text-[var(--landing-ink)] md:text-2xl lg:text-[1.75rem]">
            Run product, eng, design, and data on one floor — with AI that helps
            you decide and ship.
          </h1>
          <p className="animate-rise-delay-2 mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--landing-quiet)]">
            Stop losing context across chats and trackers. Consol keeps every
            lifecycle linked on a shared board.
          </p>
          <div className="animate-rise-delay-2 mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/app"
              className="rounded-md bg-[var(--landing-accent)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--landing-accent-hover)]"
            >
              Get started
            </Link>
            <a
              href="#how"
              className="rounded-md border border-[var(--landing-line)] bg-white/80 px-5 py-3 text-sm font-medium text-[var(--landing-ink)] transition hover:border-[var(--landing-ink)]/25"
            >
              See how it works
            </a>
          </div>
          <p className="animate-rise-delay-2 mt-3.5 text-[12px] text-[var(--landing-quiet)]">
            Free to try · No setup project · Open in under a minute
          </p>
        </div>

        <div className="relative w-full flex-1 shadow-[0_-12px_40px_rgb(20_36_28_/_0.06)]">
          <LandingWorkspace />
        </div>
      </section>

      {/* Outcomes */}
      <section
        className="border-b border-[var(--landing-line)] bg-white"
        aria-labelledby="outcomes-heading"
      >
        <div className="mx-auto w-full max-w-5xl px-6 py-16 md:px-10 md:py-20">
          <h2
            id="outcomes-heading"
            className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[var(--landing-ink)] md:text-3xl"
          >
            Why teams start with Consol
          </h2>
          <div className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
            {[
              {
                title: "Fewer blocked decisions",
                copy: "See what needs you across every linked process — then clear it with Forge in the same thread.",
              },
              {
                title: "One story for the whole org",
                copy: "Product intent stays attached to eng, design, and data work so briefs don’t drift.",
              },
              {
                title: "AI that knows the board",
                copy: "Ask for priorities, critiques, or next steps scoped to the product in front of you.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="border-l-2 border-[var(--landing-accent)] pl-4"
              >
                <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--landing-ink)]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--landing-quiet)]">
                  {item.copy}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how"
        className="mx-auto w-full max-w-5xl px-6 py-20 md:px-10 md:py-28"
      >
        <p className="text-[12px] font-semibold tracking-[0.14em] text-[var(--landing-accent)]">
          HOW IT WORKS
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--landing-ink)] md:text-4xl">
          From empty floor to shipping cadence
        </h2>
        <p className="mt-3 max-w-2xl text-[var(--landing-quiet)] md:text-lg">
          Three steps. No migration theater.
        </p>
        <ol className="mt-12 grid gap-8 md:grid-cols-3 md:gap-10">
          {[
            {
              step: "1",
              title: "Create a product",
              copy: "Stand up a shared workspace your company can see and contribute to.",
            },
            {
              step: "2",
              title: "Link lifecycles",
              copy: "Attach PM, delivery, design, or data processes — each with its own stages.",
            },
            {
              step: "3",
              title: "Coordinate with Forge",
              copy: "Clear decisions, brief work, and advance stages with AI on the same board.",
            },
          ].map((item) => (
            <li key={item.step} className="relative pt-1">
              <span className="flex size-9 items-center justify-center rounded-md bg-[var(--landing-accent)] font-[family-name:var(--font-display)] text-sm font-semibold text-white">
                {item.step}
              </span>
              <h3 className="mt-4 font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[var(--landing-ink)]">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--landing-quiet)]">
                {item.copy}
              </p>
            </li>
          ))}
        </ol>
        <div className="mt-12">
          <Link
            href="/app"
            className="inline-flex rounded-md bg-[var(--landing-accent)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--landing-accent-hover)]"
          >
            Get started
          </Link>
        </div>
      </section>

      {/* Who */}
      <section className="border-y border-[var(--landing-line)] bg-[var(--landing-soft)]">
        <div className="mx-auto w-full max-w-5xl px-6 py-20 md:px-10 md:py-24">
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--landing-ink)] md:text-4xl">
            Built for the teams that ship together
          </h2>
          <p className="mt-3 max-w-2xl text-[var(--landing-quiet)]">
            Keep specialist workflows — without losing the shared narrative.
          </p>
          <ul className="mt-12 grid gap-0 sm:grid-cols-2">
            {[
              {
                role: "Product",
                detail:
                  "Prioritize, brief, and gate decisions across linked streams.",
              },
              {
                role: "Engineering",
                detail:
                  "Advance delivery with human approvals and agent assists.",
              },
              {
                role: "Design",
                detail:
                  "Keep exploration and critique tied to product intent.",
              },
              {
                role: "Data",
                detail: "Run analysis beside the features it informs.",
              },
            ].map((item) => (
              <li
                key={item.role}
                className="border-t border-[var(--landing-line)] py-6 sm:pr-10"
              >
                <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--landing-ink)]">
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

      {/* FAQ — objection handling */}
      <section
        id="faq"
        className="mx-auto w-full max-w-5xl px-6 py-20 md:px-10 md:py-28"
        aria-labelledby="faq-heading"
      >
        <h2
          id="faq-heading"
          className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--landing-ink)] md:text-4xl"
        >
          Questions before you start
        </h2>
        <div className="mt-10">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group border-t border-[var(--landing-line)] py-5"
            >
              <summary className="cursor-pointer list-none font-medium text-[var(--landing-ink)] marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-start justify-between gap-4">
                  <span>{faq.question}</span>
                  <span
                    aria-hidden
                    className="mt-0.5 text-[var(--landing-accent)] transition group-open:rotate-45"
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

      {/* Closing CTA */}
      <section className="border-t border-[var(--landing-line)] bg-[var(--landing-soft)] px-6 py-20 md:px-10 md:py-24">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl">
            <h2 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--landing-ink)] md:text-4xl">
              Put every lifecycle on one floor
            </h2>
            <p className="mt-3 text-[var(--landing-quiet)]">
              Open Consol, create your product, and start coordinating with
              Forge today.
            </p>
          </div>
          <Link
            href="/app"
            className="inline-flex w-fit shrink-0 rounded-md bg-[var(--landing-accent)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--landing-accent-hover)]"
          >
            Get started
          </Link>
        </div>
      </section>

      <footer className="border-t border-[var(--landing-line)] bg-white px-6 py-8 md:px-10">
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
