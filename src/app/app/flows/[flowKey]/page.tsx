import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { FlowPreview } from "@/components/flow-preview";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth";
import { getFlow } from "@/lib/flows";

export default async function FlowDetailPage({
  params,
}: {
  params: Promise<{ flowKey: string }>;
}) {
  const { flowKey } = await params;
  const viewer = await getViewer();
  if (!viewer) notFound();

  const flow = getFlow(flowKey);
  if (!flow) notFound();

  return (
    <div className="mx-auto w-full max-w-[1100px] space-y-5 px-5 py-6 md:px-8 md:py-8">
      <div className="animate-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/app/flows"
            className="inline-flex items-center gap-1.5 text-[12px] text-[var(--console-faint)] transition hover:text-[var(--console-accent)]"
          >
            <ArrowLeft className="size-3" />
            Flows
          </Link>
          <div className="mt-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--console-faint)]">
              {flow.domain}
            </p>
            <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-[var(--console-ink)]">
              {flow.name}
            </h1>
            <p className="mt-1 max-w-2xl text-[13px] text-[var(--console-muted)]">
              {flow.description}
            </p>
            <p className="mt-2 font-mono text-[11px] text-[var(--console-faint)]">
              {flow.key} · {flow.stages.length} stages · entry{" "}
              <span className="text-[var(--console-muted)]">{flow.entry}</span>
            </p>
          </div>
        </div>
        <Link href={`/app/work/new?flow=${flow.key}`}>
          <Button className="h-9 gap-1.5 bg-[var(--console-ink)] text-[13px] text-white hover:bg-[var(--console-accent)]">
            Start in Work
            <ArrowRight className="size-3.5" />
          </Button>
        </Link>
      </div>

      <section className="animate-rise-delay overflow-hidden rounded-xl bg-[var(--console-surface)] shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)]">
        <header className="border-b border-[var(--console-line)] px-4 py-3">
          <h2 className="text-[13px] font-semibold text-[var(--console-ink)]">
            Start inputs
          </h2>
          <p className="mt-0.5 text-[12px] text-[var(--console-muted)]">
            Required context collected when someone starts this flow from Work.
          </p>
        </header>
        <ul className="divide-y divide-[var(--console-line)]">
          {flow.inputs.map((field) => (
            <li
              key={field.key}
              className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-[var(--console-ink)]">
                  {field.label}
                  {field.required === false ? (
                    <span className="ml-1.5 text-[11px] font-normal text-[var(--console-faint)]">
                      optional
                    </span>
                  ) : (
                    <span className="ml-1.5 text-[11px] font-normal text-[var(--console-accent)]">
                      required
                    </span>
                  )}
                </p>
                {field.description || field.placeholder ? (
                  <p className="mt-0.5 text-[12px] text-[var(--console-muted)]">
                    {field.description ?? field.placeholder}
                  </p>
                ) : null}
              </div>
              <p className="font-mono text-[11px] text-[var(--console-faint)]">
                {field.key} · {field.type}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <FlowPreview flow={flow} />
    </div>
  );
}
