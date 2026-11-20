import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { FlowPreview } from "@/components/flow-preview";
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
      <div className="animate-rise">
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

      <FlowPreview flow={flow} />
    </div>
  );
}
