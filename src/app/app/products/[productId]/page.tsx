import Link from "next/link";
import { notFound } from "next/navigation";
import { addProcessAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { getViewer } from "@/lib/auth";
import {
  PROCESS_TEMPLATES,
  assertProductAccess,
  listProcesses,
} from "@/lib/factory";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const viewer = await getViewer();
  if (!viewer) notFound();

  const product = await assertProductAccess(productId, viewer.sub);
  if (!product) notFound();

  const processes = await listProcesses(product.id);
  const usedKeys = new Set(processes.map((p) => p.template_key));

  return (
    <div className="mx-auto w-full max-w-[960px] space-y-6 px-5 py-6 md:px-8 md:py-8">
      <div>
        <Link
          href="/app"
          className="text-[12px] text-[var(--console-faint)] transition hover:text-[var(--console-accent)]"
        >
          ← Workspace
        </Link>
        <h1 className="mt-2 text-[22px] font-semibold tracking-tight text-[var(--console-ink)]">
          {product.name}
        </h1>
        <p className="mt-1 max-w-2xl text-[13px] text-[var(--console-muted)]">
          {product.description ||
            "Link the professional lifecycles this product needs."}
        </p>
      </div>

      <section className="overflow-hidden rounded-xl bg-[var(--console-surface)] shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)]">
        <div className="border-b border-[var(--console-line)] px-4 py-3">
          <h2 className="text-[13px] font-semibold text-[var(--console-ink)]">
            Processes
          </h2>
        </div>
        {processes.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-[13px] text-[var(--console-muted)]">
              No processes yet. Add a template below.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--console-line)]">
            {processes.map((process) => (
              <li key={process.id}>
                <Link
                  href={`/app/products/${product.id}/processes/${process.id}`}
                  className="block px-4 py-3.5 transition hover:bg-[var(--console-hover)]"
                >
                  <p className="text-[11px] text-[var(--console-faint)]">
                    {process.domain}
                  </p>
                  <h3 className="mt-0.5 text-[13px] font-medium text-[var(--console-ink)]">
                    {process.name}
                  </h3>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="overflow-hidden rounded-xl bg-[var(--console-surface)] shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)]">
        <div className="border-b border-[var(--console-line)] px-4 py-3">
          <h2 className="text-[13px] font-semibold text-[var(--console-ink)]">
            Add a lifecycle
          </h2>
        </div>
        <ul className="divide-y divide-[var(--console-line)]">
          {PROCESS_TEMPLATES.map((template) => (
            <li key={template.key} className="px-4 py-4">
              <form
                action={addProcessAction}
                className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
              >
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="templateKey" value={template.key} />
                <div className="min-w-0">
                  <h3 className="text-[13px] font-medium text-[var(--console-ink)]">
                    {template.name}
                  </h3>
                  <p className="mt-0.5 text-[12px] text-[var(--console-muted)]">
                    {template.description}
                  </p>
                  <p className="mt-2 text-[11px] text-[var(--console-faint)]">
                    {template.stages.map((s) => s.name).join(" → ")}
                  </p>
                </div>
                <Button
                  type="submit"
                  size="sm"
                  className={
                    usedKeys.has(template.key)
                      ? "h-8 shrink-0 rounded-md text-[12px]"
                      : "h-8 shrink-0 rounded-md bg-[var(--console-ink)] text-[12px] text-white hover:bg-[var(--console-accent)]"
                  }
                  variant={usedKeys.has(template.key) ? "outline" : "default"}
                >
                  {usedKeys.has(template.key) ? "Add another" : "Add process"}
                </Button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
