import Link from "next/link";
import { notFound } from "next/navigation";
import { IssueFocus } from "@/components/issue-focus";
import { getViewer } from "@/lib/auth";
import {
  assertProcessAccess,
  getWorkItem,
  listMessages,
  listStageRunEvents,
  listStageTransitions,
  listStages,
} from "@/lib/factory";
import { getFlow } from "@/lib/flows";
import { listWorkItemExternalLinks } from "@/lib/integrations";

export default async function WorkItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;
  const viewer = await getViewer();
  if (!viewer) notFound();

  const item = await getWorkItem(itemId);
  if (!item) notFound();

  const process = await assertProcessAccess(item.process_id, viewer.sub);
  if (!process) notFound();

  const [stages, transitions, itemMessages, runEvents, externalLinks] =
    await Promise.all([
      listStages(process.id),
      listStageTransitions(process.id),
      listMessages({ workItemId: item.id }),
      listStageRunEvents(item.id),
      listWorkItemExternalLinks(item.id),
    ]);

  const flowBacked =
    transitions.length > 0 &&
    stages.some((s) => s.stage_type && s.stage_type !== "legacy");
  const flow = getFlow(process.template_key);

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-5 px-5 py-6 md:px-8 md:py-8">
      <div className="animate-rise text-[12px] text-[var(--console-faint)]">
        <Link
          href="/app/work"
          className="transition hover:text-[var(--console-accent)]"
        >
          Work
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-[var(--console-muted)]">{process.name}</span>
      </div>
      <IssueFocus
        productId={process.product_id}
        processId={process.id}
        item={item}
        stages={stages}
        transitions={transitions}
        flowBacked={flowBacked}
        runEvents={runEvents}
        messages={itemMessages}
        externalLinks={externalLinks}
        backHref="/app/work"
        flowInputs={flow?.inputs ?? []}
      />
    </div>
  );
}
