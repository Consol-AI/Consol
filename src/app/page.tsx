import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getViewer } from "@/lib/auth";

export default async function HomePage() {
  const viewer = await getViewer();

  return (
    <main className="relative flex min-h-screen flex-col">
      <SiteHeader viewer={viewer} />
      <section className="relative isolate flex min-h-screen flex-col justify-end overflow-hidden px-6 pb-16 pt-28 md:px-10 md:pb-20">
        <div
          aria-hidden
          className="animate-drift absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_20%_20%,var(--hero-glow),transparent_45%),radial-gradient(ellipse_at_80%_0%,#3a5a2c,transparent_40%),linear-gradient(160deg,var(--hero-deep),var(--hero-mid)_55%,#234433)]"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-40"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cg fill='none' stroke='%23f3efe4' stroke-opacity='0.08'%3E%3Cpath d='M0 40h160M0 80h160M0 120h160M40 0v160M80 0v160M120 0v160'/%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />
        <div className="animate-pulse-line absolute inset-x-0 top-1/3 -z-10 h-px bg-gradient-to-r from-transparent via-[#f3efe4]/50 to-transparent" />

        <div className="mx-auto w-full max-w-5xl text-[var(--paper)]">
          <p className="animate-rise font-[family-name:var(--font-display)] text-5xl leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
            Consol
          </p>
          <h1 className="animate-rise-delay mt-5 max-w-2xl text-xl leading-snug text-[#d9e4dc] md:text-2xl">
            The product factory where every team&apos;s lifecycle — and every
            professional inside it — collaborates with AI in one place.
          </h1>
          <div className="animate-rise-delay mt-8 flex flex-wrap gap-3">
            <Link
              href="/app"
              className="rounded-md bg-[var(--paper)] px-5 py-2.5 text-sm font-medium text-[var(--ink)] transition hover:bg-white"
            >
              Enter your factory
            </Link>
            <a
              href="#how"
              className="rounded-md border border-[#f3efe4]/35 px-5 py-2.5 text-sm text-[var(--paper)] transition hover:border-[var(--paper)]"
            >
              See how it fits
            </a>
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto w-full max-w-5xl px-6 py-20 md:px-10">
        <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight md:text-4xl">
          One floor for many processes
        </h2>
        <p className="mt-3 max-w-2xl text-[var(--quiet)]">
          Product management can span software delivery, design, and analysis.
          Consol keeps those lifecycles linked so people and AI share the same
          board, brief, and thread.
        </p>
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {[
            {
              title: "Shared products",
              copy: "Stand up a product workspace your whole company can see and contribute to.",
            },
            {
              title: "Linked lifecycles",
              copy: "Attach PM, engineering, design, or data processes — each with its own stages.",
            },
            {
              title: "AI in the loop",
              copy: "Ask Forge for next steps, briefs, or critiques scoped to the work in front of you.",
            },
          ].map((item) => (
            <div key={item.title} className="border-t border-[var(--line)] pt-4">
              <h3 className="font-medium tracking-tight">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--quiet)]">
                {item.copy}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
