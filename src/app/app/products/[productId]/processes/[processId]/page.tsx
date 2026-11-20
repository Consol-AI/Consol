import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, GitBranch, Sparkles } from "lucide-react";
import { AiPanel } from "@/components/ai-panel";
import { ProcessBoard } from "@/components/process-board";
import { WorkItemSheet } from "@/components/work-item-sheet";
import { Badge } from "@/components/ui/badge";
import { getViewer } from "@/lib/auth";
import {
  assertProductAccess,
  getProcess,
  getWorkItem,
  listMessages,
  listStageTransitions,
  listStages,
  listWorkItems,
} from "@/lib/factory";

export default async function ProcessPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string; processId: string }>;
  searchParams: Promise<{ item?: string }>;
}) {
  const { productId, processId } = await params;
  const { item: itemId } = await searchParams;
  const viewer = await getViewer();
  if (!viewer) notFound();

  const product = await assertProductAccess(productId, viewer.sub);
  if (!product) notFound();

  const process = await getProcess(processId);
  if (!process || process.product_id !== product.id) notFound();

  const [stages, items, processMessages, transitions] = await Promise.all([
    listStages(process.id),
    listWorkItems(process.id),
    listMessages({ processId: process.id }),
    listStageTransitions(process.id),
  ]);
  const flowBacked =
    transitions.length > 0 &&
    stages.some((s) => s.stage_type && s.stage_type !== "legacy");

  const selected = itemId ? await getWorkItem(itemId) : null;
  const selectedSafe =
    selected && selected.process_id === process.id ? selected : null;
  const itemMessages = selectedSafe
    ? await listMessages({ workItemId: selectedSafe.id })
    : [];

  const openCount = items.filter((i) => i.status !== "done").length;
  const doneCount = items.filter((i) => i.status === "done").length;

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
              {openCount} open · {doneCount} done · {stages.length} stages
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="animate-rise-delay min-w-0">
          <ProcessBoard
            productId={product.id}
            processId={process.id}
            stages={stages}
            items={items}
            transitions={transitions}
            flowBacked={flowBacked}
          />
        </div>
        <aside className="animate-rise-delay overflow-hidden rounded-xl bg-[var(--console-surface)] shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)] xl:sticky xl:top-6 xl:self-start">
          <div className="flex items-center gap-2 border-b border-[var(--console-line)] px-4 py-3">
            <Sparkles className="size-3.5 text-[var(--console-accent)]" />
            <p className="text-[13px] font-semibold text-[var(--console-ink)]">
              Process AI
            </p>
          </div>
          <AiPanel
            processId={process.id}
            initialMessages={processMessages}
            title="Process AI"
            embedded
          />
        </aside>
      </div>

      <WorkItemSheet
        productId={product.id}
        processId={process.id}
        item={selectedSafe}
        messages={itemMessages}
      />
    </div>
  );
}
