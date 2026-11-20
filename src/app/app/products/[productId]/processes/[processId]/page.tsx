import Link from "next/link";
import { notFound } from "next/navigation";
import { AiPanel } from "@/components/ai-panel";
import { ProcessBoard } from "@/components/process-board";
import { WorkItemSheet } from "@/components/work-item-sheet";
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

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/app/products/${product.id}`}
          className="text-sm text-[var(--quiet)] hover:underline"
        >
          ← {product.name}
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--quiet)]">
              {process.domain}
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-tight">
              {process.name}
            </h1>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <ProcessBoard
          productId={product.id}
          processId={process.id}
          stages={stages}
          items={items}
          transitions={transitions}
          flowBacked={flowBacked}
        />
        <div className="overflow-hidden rounded-lg border border-[var(--line)]">
          <AiPanel
            processId={process.id}
            initialMessages={processMessages}
            title="Process AI"
          />
        </div>
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
