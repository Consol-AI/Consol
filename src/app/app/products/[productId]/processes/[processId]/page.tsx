import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, GitBranch } from "lucide-react";
import { IssueFocus } from "@/components/issue-focus";
import { IssueList } from "@/components/issue-list";
import { ProcessBoard } from "@/components/process-board";
import {
  ProcessViewToggle,
  type ProcessViewMode,
} from "@/components/process-view-toggle";
import { Badge } from "@/components/ui/badge";
import { getViewer } from "@/lib/auth";
import {
  assertProductAccess,
  getProcess,
  getWorkItem,
  listMessages,
  listStageRunEvents,
  listStageTransitions,
  listStages,
  listWorkItems,
} from "@/lib/factory";
import { getFlow } from "@/lib/flows";
import { attentionCounts } from "@/lib/issues/attention";

export default async function ProcessPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string; processId: string }>;
  searchParams: Promise<{ item?: string; view?: string }>;
}) {
  const { productId, processId } = await params;
  const { item: itemId, view: viewParam } = await searchParams;
  const viewer = await getViewer();
  if (!viewer) notFound();

  const product = await assertProductAccess(productId, viewer.sub);
  if (!product) notFound();

  const process = await getProcess(processId);
  if (!process || process.product_id !== product.id) notFound();

  const [stages, items, transitions] = await Promise.all([
    listStages(process.id),
    listWorkItems(process.id),
    listStageTransitions(process.id),
  ]);
  const flowBacked =
    transitions.length > 0 &&
    stages.some((s) => s.stage_type && s.stage_type !== "legacy");

  const flow = getFlow(process.template_key);
  const entryStage =
    (flow
      ? stages.find((s) => s.stage_key === flow.entry)
      : null) ?? stages[0];
  const entryStageId = entryStage?.id ?? "";

  const view: ProcessViewMode = viewParam === "board" ? "board" : "list";
  const counts = attentionCounts(items, stages);

  const selected = itemId ? await getWorkItem(itemId) : null;
  const selectedSafe =
    selected && selected.process_id === process.id ? selected : null;

  if (selectedSafe) {
    const [itemMessages, runEvents] = await Promise.all([
      listMessages({ workItemId: selectedSafe.id }),
      listStageRunEvents(selectedSafe.id),
    ]);

    return (
      <div className="mx-auto w-full max-w-[1200px] space-y-5 px-5 py-6 md:px-8 md:py-8">
        <div className="animate-rise text-[12px]">
          <Link
            href={`/app/products/${product.id}`}
            className="inline-flex items-center gap-1.5 text-[var(--console-faint)] transition hover:text-[var(--console-accent)]"
          >
            <ArrowLeft className="size-3" />
            {product.name}
          </Link>
          <span className="mx-2 text-[var(--console-line)]">/</span>
          <span className="text-[var(--console-muted)]">{process.name}</span>
        </div>
        <div className="animate-rise-delay">
          <IssueFocus
            productId={product.id}
            processId={process.id}
            item={selectedSafe}
            stages={stages}
            transitions={transitions}
            flowBacked={flowBacked}
            runEvents={runEvents}
            messages={itemMessages}
            returnView={view}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5 px-5 py-6 md:px-8 md:py-8">
      <div className="animate-rise">
        <Link
          href={`/app/products/${product.id}`}
          className="inline-flex items-center gap-1.5 text-[12px] text-[var(--console-faint)] transition hover:text-[var(--console-accent)]"
        >
          <ArrowLeft className="size-3" />
          {product.name}
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--console-faint)]">
                {process.domain}
              </p>
              {flowBacked ? (
                <Badge
                  variant="outline"
                  className="h-5 gap-1 border-transparent bg-[var(--console-accent-soft)] px-1.5 text-[10px] text-[var(--console-accent)]"
                >
                  <GitBranch className="size-3" />
                  Directed flow
                </Badge>
              ) : null}
            </div>
            <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-[var(--console-ink)]">
              {process.name}
            </h1>
            <p className="mt-1 text-[13px] text-[var(--console-muted)]">
              {counts.needs_you} need you · {counts.agents_working} agents
              working · {counts.done} done
            </p>
          </div>
          <ProcessViewToggle
            productId={product.id}
            processId={process.id}
            view={view}
          />
        </div>
      </div>

      <div className="animate-rise-delay min-w-0">
        {view === "board" ? (
          <ProcessBoard
            productId={product.id}
            processId={process.id}
            stages={stages}
            items={items}
            entryStageId={entryStageId}
          />
        ) : (
          <IssueList
            productId={product.id}
            processId={process.id}
            stages={stages}
            items={items}
            entryStageId={entryStageId}
          />
        )}
      </div>
    </div>
  );
}
