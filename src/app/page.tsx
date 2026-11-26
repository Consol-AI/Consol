import type { Metadata } from "next";
import {
  ArrowRight,
  Bot,
  Boxes,
  Check,
  GitCommitHorizontal,
  GitPullRequest,
  History,
  MessagesSquare,
  ScrollText,
  Terminal,
  UserCheck,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { FactoryEnterLink } from "@/components/factory-enter-link";
import { LiveDot } from "@/components/live-dot";
import { SiteHeader } from "@/components/site-header";
import { cn } from "@/lib/utils";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: site.title },
  alternates: { canonical: "/" },
};

type Actor = "agent" | "human" | "script";

const ACTOR_STYLE: Record<Actor, { dot: string; badge: string }> = {
  agent: {
    dot: "bg-indigo-500 text-white",
    badge: "bg-indigo-500/10 text-indigo-600 ring-indigo-500/20",
  },
  human: {
    dot: "bg-amber-500 text-white",
    badge: "bg-amber-500/10 text-amber-700 ring-amber-500/20",
  },
  script: {
    dot: "bg-zinc-700 text-white",
    badge: "bg-zinc-500/10 text-zinc-600 ring-zinc-500/20",
  },
};

const ACTOR_STYLE_DARK: Record<Actor, string> = {
  agent: "bg-indigo-500/15 text-indigo-300 ring-indigo-400/30",
  human: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
  script: "bg-white/10 text-zinc-300 ring-white/15",
};

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

const HERO_STAGES = ["Spec", "Build", "Open PR", "Review", "Test", "Ship"];
const HERO_CURRENT = 3;

const HERO_ACTIVITY: {
  icon: LucideIcon;
  actor: Actor;
  who: string;
  what: string;
  stage: string;
  when: string;
  live?: boolean;
}[] = [
  {
    icon: UserCheck,
    actor: "human",
    who: "Priya",
    what: "is reviewing the draft PR",
    stage: "Review",
    when: "now",
    live: true,
  },
  {
    icon: GitPullRequest,
    actor: "agent",
    who: "Engineer",
    what: "opened draft PR #142",
    stage: "Open PR",
    when: "4m",
  },
  {
    icon: Terminal,
    actor: "script",
    who: "CI",
    what: "lint and 214 unit tests passed",
    stage: "Build",
    when: "12m",
  },
  {
    icon: GitCommitHorizontal,
    actor: "agent",
    who: "Engineer",
    what: "pushed 6 commits to feat/usage-billing",
    stage: "Build",
    when: "38m",
  },
  {
    icon: Check,
    actor: "human",
    who: "Priya",
    what: "approved the spec",
    stage: "Spec",
    when: "1h",
  },
];

const WIP: {
  item: string;
  product: string;
  flow: string;
  stage: string;
  step: number;
  total: number;
  owner: string;
  actor: Actor;
  updated: string;
}[] = [
  {
    item: "Usage-based billing",
    product: "Checkout",
    flow: "Software delivery",
    stage: "Review",
    step: 4,
    total: 6,
    owner: "Priya",
    actor: "human",
    updated: "4m ago",
  },
  {
    item: "Onboarding redesign",
    product: "Activation",
    flow: "Design",
    stage: "Critique",
    step: 3,
    total: 5,
    owner: "Designer",
    actor: "agent",
    updated: "12m ago",
  },
  {
    item: "Q3 churn drivers",
    product: "Retention",
    flow: "Data analysis",
    stage: "Analyze",
    step: 3,
    total: 5,
    owner: "Analyst",
    actor: "agent",
    updated: "26m ago",
  },
  {
    item: "SSO for workspaces",
    product: "Platform",
    flow: "Product management",
    stage: "Prioritize",
    step: 3,
    total: 5,
    owner: "Sam",
    actor: "human",
    updated: "1h ago",
  },
  {
    item: "Export to CSV",
    product: "Reporting",
    flow: "Software delivery",
    stage: "Test",
    step: 5,
    total: 6,
    owner: "CI",
    actor: "script",
    updated: "2h ago",
  },
];

const HISTORY: {
  day: string;
  flow: string;
  events: { actor: Actor; who: string; what: string }[];
}[] = [
  {
    day: "Mon",
    flow: "Product management",
    events: [
      { actor: "agent", who: "Forge", what: "summarized 38 customer calls into a problem brief" },
      { actor: "human", who: "Sam", what: "defined the goal: pricing that scales with usage" },
    ],
  },
  {
    day: "Tue",
    flow: "Data analysis",
    events: [
      { actor: "agent", who: "Analyst", what: "modeled revenue impact across 1,200 accounts" },
      { actor: "human", who: "Sam", what: "approved Prioritize — moved to Validate" },
    ],
  },
  {
    day: "Wed",
    flow: "Design",
    events: [
      { actor: "agent", who: "Designer", what: "explored three pricing page directions" },
      { actor: "human", who: "Lena", what: "picked direction B and handed off specs" },
    ],
  },
  {
    day: "Thu",
    flow: "Software delivery",
    events: [
      { actor: "agent", who: "Engineer", what: "drafted the spec and opened draft PR #142" },
      { actor: "human", who: "Priya", what: "is reviewing now" },
    ],
  },
];

const FEATURES = [
  {
    icon: Boxes,
    title: "One shared workspace",
    copy: "One place for every brief, decision, and work item — visible to the whole company.",
  },
  {
    icon: Workflow,
    title: "Linked lifecycles",
    copy: "Product, engineering, design, and data flows side by side in one workspace, each with its own stages.",
  },
  {
    icon: Bot,
    title: "AI teammates",
    copy: "Specialist agents — engineer, designer, analyst — that pick up stages and hand off to people.",
  },
  {
    icon: UserCheck,
    title: "Human approval gates",
    copy: "Every stage is typed as agent, human, or script. AI moves fast; people sign off where it matters.",
  },
  {
    icon: GitPullRequest,
    title: "From spec to pull request",
    copy: "Connect GitHub and let the delivery flow open draft PRs straight from an approved spec.",
  },
  {
    icon: MessagesSquare,
    title: "Forge, in context",
    copy: "Ask for next steps, briefs, or critiques scoped to the workspace, flow, or item in front of you.",
  },
];

const FAQ = [
  {
    q: "What is Consol?",
    a: "Consol is an AI product factory: a shared workspace where product management, software delivery, design, and data analysis run as linked workflows, with AI teammates working alongside the people on your team.",
  },
  {
    q: "How is Consol different from a project management tool?",
    a: "Traditional tools track tasks. Consol models the lifecycle itself — typed stages for agents, humans, and scripts — so AI can do real work inside your process while people keep control of approvals. Every step is recorded, so you always see what is in progress and how it got there.",
  },
  {
    q: "What are AI teammates?",
    a: "Teammates are specialist agents with their own persona, model, brief, and tools. Start from a preset like Engineer, Designer, or Data analyst, or build one from scratch. Each one is also a deployable Agent SDK project.",
  },
  {
    q: "Which integrations are supported?",
    a: "GitHub is available today for opening draft pull requests from the software delivery flow. More connectors are on the way.",
  },
  {
    q: "Can I try Consol without setting anything up?",
    a: "Yes. Open the workspace to explore flows, work, and teammates in a demo environment.",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${site.url}/#organization`,
      name: site.name,
      url: site.url,
    },
    {
      "@type": "WebSite",
      "@id": `${site.url}/#website`,
      name: site.name,
      url: site.url,
      publisher: { "@id": `${site.url}/#organization` },
    },
    {
      "@type": "SoftwareApplication",
      name: site.name,
      url: site.url,
      description: site.description,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      publisher: { "@id": `${site.url}/#organization` },
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-medium text-indigo-600">{children}</p>
  );
}

function SectionTitle({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <h2
      id={id}
      className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-balance text-zinc-950 md:text-5xl"
    >
      {children}
    </h2>
  );
}

/** Hero visual: a single work item mid-flight with its activity log. */
function WorkItemPreview() {
  return (
    <div
      aria-hidden
      className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 shadow-[0_40px_120px_-30px_rgb(79_70_229/0.45)]"
    >
      <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-900/90">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <div>
            <p className="text-xs text-zinc-500">
              Checkout · Software delivery
            </p>
            <p className="mt-1 font-medium text-white">Usage-based billing</p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-400/10 px-2.5 py-1 text-xs font-medium text-amber-300 ring-1 ring-amber-400/25">
            <LiveDot className="text-amber-400" />
            In review
          </span>
        </div>

        {/* Stage progress */}
        <div className="border-b border-white/[0.08] px-5 py-4">
          <div className="flex gap-1">
            {HERO_STAGES.map((stage, i) => (
              <div
                key={stage}
                className={cn(
                  "h-1 flex-1 rounded-full",
                  i < HERO_CURRENT && "bg-indigo-400",
                  i === HERO_CURRENT &&
                    "bg-gradient-to-r from-indigo-400 to-zinc-700",
                  i > HERO_CURRENT && "bg-zinc-700",
                )}
              />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[11px]">
            {HERO_STAGES.map((stage, i) => (
              <span
                key={stage}
                className={cn(
                  i < HERO_CURRENT && "text-zinc-400",
                  i === HERO_CURRENT && "font-medium text-white",
                  i > HERO_CURRENT && "text-zinc-600",
                )}
              >
                {stage}
              </span>
            ))}
          </div>
        </div>

        {/* Activity */}
        <ol className="px-5 py-4">
          {HERO_ACTIVITY.map((event, i) => {
            const Icon = event.icon;
            const last = i === HERO_ACTIVITY.length - 1;
            return (
              <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                {!last && (
                  <span className="absolute left-[13px] top-7 bottom-0 w-px bg-white/10" />
                )}
                <span
                  className={cn(
                    "relative grid size-7 shrink-0 place-items-center rounded-full ring-1",
                    ACTOR_STYLE_DARK[event.actor],
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[13px] leading-snug text-zinc-300">
                    <span className="font-medium text-white">{event.who}</span>{" "}
                    {event.what}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-500">
                    <span>{event.stage}</span>
                    <span>·</span>
                    <span className="capitalize">{event.actor}</span>
                  </p>
                </div>
                <span
                  className={cn(
                    "pt-0.5 text-[11px] tabular-nums",
                    event.live ? "font-medium text-amber-300" : "text-zinc-500",
                  )}
                >
                  {event.when}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/** Section visual: everything in flight across products. */
function WorkInProgressBoard() {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_24px_60px_-30px_rgb(24_24_27/0.25)]"
    >
      <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3.5">
        <div className="flex items-center gap-2 text-sm font-medium text-zinc-950">
          <LiveDot className="text-indigo-500" />
          In progress
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-normal text-zinc-500">
            {WIP.length}
          </span>
        </div>
        <div className="hidden gap-1.5 text-xs sm:flex">
          {(["agent", "human", "script"] as const).map((actor) => (
            <span
              key={actor}
              className={cn(
                "rounded-full px-2 py-0.5 capitalize ring-1",
                ACTOR_STYLE[actor].badge,
              )}
            >
              {actor}
            </span>
          ))}
        </div>
      </div>
      <div className="hidden grid-cols-[1.6fr_1.2fr_1.3fr_1fr_0.7fr] gap-4 border-b border-zinc-100 bg-zinc-50/80 px-5 py-2.5 text-xs font-medium text-zinc-500 md:grid">
        <span>Item</span>
        <span>Lifecycle</span>
        <span>Stage</span>
        <span>Owner</span>
        <span className="text-right">Updated</span>
      </div>
      <ul className="divide-y divide-zinc-100">
        {WIP.map((row) => (
          <li
            key={row.item}
            className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-3.5 text-sm md:grid-cols-[1.6fr_1.2fr_1.3fr_1fr_0.7fr]"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-zinc-950">{row.item}</p>
              <p className="text-xs text-zinc-500">{row.product}</p>
            </div>
            <span className="hidden text-zinc-600 md:block">{row.flow}</span>
            <div className="col-span-2 row-start-2 md:col-span-1 md:row-start-auto">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-800">{row.stage}</span>
                <span className="tabular-nums text-zinc-400">
                  {row.step}/{row.total}
                </span>
              </div>
              <div className="mt-1.5 h-1 rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                  style={{ width: `${(row.step / row.total) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 justify-self-end md:justify-self-start">
              <span
                className={cn(
                  "grid size-6 place-items-center rounded-full text-[10px] font-semibold",
                  ACTOR_STYLE[row.actor].dot,
                )}
              >
                {row.owner[0]}
              </span>
              <span className="text-zinc-700">{row.owner}</span>
            </div>
            <span className="hidden text-right text-xs tabular-nums text-zinc-500 md:block">
              {row.updated}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Section visual: one product's history across lifecycles. */
function HistoryTimeline() {
  return (
    <div
      aria-hidden
      className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-[0_24px_60px_-30px_rgb(24_24_27/0.25)]"
    >
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-medium text-zinc-950">
          <History className="size-4 text-zinc-400" />
          Usage-based billing · history
        </p>
        <span className="text-xs text-zinc-500">4 lifecycles · 8 events</span>
      </div>
      <ol className="mt-6 space-y-6">
        {HISTORY.map((day, d) => (
          <li key={day.day} className="grid grid-cols-[2.5rem_1fr] gap-4">
            <span className="pt-0.5 text-xs font-medium text-zinc-400">
              {day.day}
            </span>
            <div className="relative border-l border-zinc-200 pl-5">
              <span
                className={cn(
                  "absolute -left-[5px] top-1.5 size-[9px] rounded-full ring-4 ring-white",
                  d === HISTORY.length - 1 ? "bg-indigo-500" : "bg-zinc-300",
                )}
              />
              <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                {day.flow}
              </p>
              <ul className="mt-2.5 space-y-2">
                {day.events.map((event, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <span
                      className={cn(
                        "mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium capitalize ring-1",
                        ACTOR_STYLE[event.actor].badge,
                      )}
                    >
                      {event.actor}
                    </span>
                    <span className="text-zinc-600">
                      <span className="font-medium text-zinc-950">
                        {event.who}
                      </span>{" "}
                      {event.what}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-zinc-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <SiteHeader />
      <main id="main" className="flex flex-col">
        {/* Hero */}
        <section
          aria-labelledby="hero-title"
          className="relative isolate overflow-hidden bg-zinc-950 px-6 pb-24 pt-36 text-white md:px-10 md:pb-32 md:pt-44"
        >
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_75%_10%,rgb(99_102_241/0.28),transparent),radial-gradient(ellipse_50%_40%_at_10%_90%,rgb(139_92_246/0.14),transparent)]"
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 opacity-70 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Cpath d='M48 0H0v48' fill='none' stroke='%23ffffff' stroke-opacity='0.05'/%3E%3C/svg%3E\")",
            }}
          />

          <div className="mx-auto grid w-full max-w-6xl items-center gap-16 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="animate-rise inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                <span className="size-1.5 rounded-full bg-indigo-400" />
                Now with GitHub draft pull requests
              </p>
              <h1
                id="hero-title"
                className="animate-rise mt-6 text-5xl font-semibold leading-[1.02] tracking-[-0.045em] text-balance md:text-6xl lg:text-7xl"
              >
                The AI product factory for{" "}
                <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                  cross-functional
                </span>{" "}
                teams
              </h1>
              <p className="animate-rise-delay mt-6 max-w-lg text-lg leading-relaxed text-zinc-400 text-pretty">
                See every piece of work in flight — and exactly how it got
                there. Consol runs product, engineering, design, and data
                lifecycles in one workspace, with AI teammates working
                alongside your people.
              </p>
              <div className="animate-rise-delay mt-9 flex flex-wrap items-center gap-3">
                <FactoryEnterLink className="inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-medium text-zinc-950 transition hover:bg-zinc-200">
                  Enter your factory
                </FactoryEnterLink>
                <a
                  href="#work"
                  className="inline-flex items-center gap-1.5 rounded-full px-5 py-3 text-sm text-zinc-300 transition hover:text-white"
                >
                  See it in action
                  <ArrowRight aria-hidden className="size-4" />
                </a>
              </div>
            </div>
            <div className="animate-rise-delay">
              <WorkItemPreview />
            </div>
          </div>
        </section>

        {/* Work in progress */}
        <section
          id="work"
          aria-labelledby="work-title"
          className="scroll-mt-16 bg-zinc-50 px-6 py-24 md:px-10 md:py-32"
        >
          <div className="mx-auto w-full max-w-6xl">
            <div className="max-w-2xl">
              <Eyebrow>Work in progress</Eyebrow>
              <SectionTitle id="work-title">
                Everything in flight, at a glance
              </SectionTitle>
              <p className="mt-4 text-lg leading-relaxed text-zinc-600">
                Every work item across every flow, its current stage, and
                who holds it right now — a person, an AI teammate, or an
                automated script. No status meetings required.
              </p>
            </div>
            <div className="mt-12">
              <WorkInProgressBoard />
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          aria-labelledby="features-title"
          className="scroll-mt-16 px-6 py-24 md:px-10 md:py-32"
        >
          <div className="mx-auto w-full max-w-6xl">
            <div className="max-w-2xl">
              <Eyebrow>Features</Eyebrow>
              <SectionTitle id="features-title">
                One workspace for every process your product touches
              </SectionTitle>
              <p className="mt-4 text-lg leading-relaxed text-zinc-600">
                Stop stitching together trackers, docs, and chatbots. Consol
                keeps lifecycles linked so context never gets lost between
                teams — or between people and AI.
              </p>
            </div>
            <ul className="mt-14 grid overflow-hidden rounded-2xl border border-zinc-200 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, copy }) => (
                <li
                  key={title}
                  className="-mb-px -mr-px border-b border-r border-zinc-200 p-7 transition-colors hover:bg-zinc-50"
                >
                  <Icon aria-hidden className="size-5 text-indigo-600" />
                  <h3 className="mt-4 font-semibold tracking-tight text-zinc-950">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                    {copy}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* History */}
        <section
          id="history"
          aria-labelledby="history-title"
          className="scroll-mt-16 border-t border-zinc-200 bg-zinc-50 px-6 py-24 md:px-10 md:py-32"
        >
          <div className="mx-auto grid w-full max-w-6xl items-start gap-14 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="lg:sticky lg:top-28">
              <Eyebrow>Work history</Eyebrow>
              <SectionTitle id="history-title">
                Every handoff, on the record
              </SectionTitle>
              <p className="mt-4 text-lg leading-relaxed text-zinc-600">
                Follow a feature from the first customer call to the pull
                request. Each step records who did it, which lifecycle it
                belonged to, and what was decided.
              </p>
              <ul className="mt-8 space-y-4 text-sm text-zinc-700">
                {[
                  {
                    icon: ScrollText,
                    text: "A full audit trail of agent work and human approvals",
                  },
                  {
                    icon: Workflow,
                    text: "Handoffs between PM, design, data, and engineering in one thread",
                  },
                  {
                    icon: Bot,
                    text: "AI teammates pick up with full context of what came before",
                  },
                ].map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-zinc-200 bg-white">
                      <Icon aria-hidden className="size-3.5 text-indigo-600" />
                    </span>
                    <span className="pt-1">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <HistoryTimeline />
          </div>
        </section>

        {/* FAQ */}
        <section
          id="faq"
          aria-labelledby="faq-title"
          className="scroll-mt-16 border-t border-zinc-200 px-6 py-24 md:px-10 md:py-32"
        >
          <div className="mx-auto w-full max-w-3xl">
            <h2
              id="faq-title"
              className="text-center text-3xl font-semibold tracking-[-0.03em] md:text-5xl"
            >
              Frequently asked questions
            </h2>
            <div className="mt-12 divide-y divide-zinc-200 border-y border-zinc-200">
              {FAQ.map((item) => (
                <details key={item.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-left [&::-webkit-details-marker]:hidden">
                    <h3 className="text-base font-medium tracking-tight md:text-lg">
                      {item.q}
                    </h3>
                    <span
                      aria-hidden
                      className="grid size-7 shrink-0 place-items-center rounded-full border border-zinc-200 text-zinc-500 transition group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 pr-12 leading-relaxed text-zinc-600">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section aria-labelledby="cta-title" className="px-6 pb-24 md:px-10">
          <div className="relative isolate mx-auto w-full max-w-6xl overflow-hidden rounded-3xl bg-zinc-950 px-8 py-16 text-center text-white md:py-20">
            <div
              aria-hidden
              className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_80%_at_50%_0%,rgb(99_102_241/0.35),transparent)]"
            />
            <h2
              id="cta-title"
              className="mx-auto max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-balance md:text-5xl"
            >
              See what your team is building — right now
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-zinc-400">
              Open the workspace and explore flows, work, and AI teammates
              in minutes.
            </p>
            <FactoryEnterLink className="mt-8 inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-medium text-zinc-950 transition hover:bg-zinc-200">
              Enter your factory
            </FactoryEnterLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-200 px-6 py-10 md:px-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-4 text-sm text-zinc-500 sm:flex-row sm:items-center">
          <p>
            <span className="font-semibold text-zinc-950">Consol</span> · The
            AI product factory
          </p>
          <p>© {new Date().getFullYear()} Consol</p>
        </div>
      </footer>
    </div>
  );
}
