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
    <div className="mx-auto w-full max-w-5xl space-y-8 p-5 md:p-7">
      <div>
        <Link
          href="/app"
          className="text-sm text-[var(--console-muted)] hover:text-[var(--console-accent)]"
        >
          ← Workspace
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--console-ink)]">
          {product.name}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--console-muted)]">
          {product.description ||
            "Link the professional lifecycles this product needs."}
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-[var(--console-ink)]">
          Processes on this floor
        </h2>
        {processes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--console-line)] bg-[var(--console-surface)] px-6 py-10 text-center">
            <p className="text-sm text-[var(--console-muted)]">
              No processes yet. Add a template below to open the first board.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {processes.map((process) => (
              <li key={process.id}>
                <Link
                  href={`/app/products/${product.id}/processes/${process.id}`}
                  className="block rounded-xl border border-[var(--console-line)] bg-[var(--console-surface)] p-5 transition hover:border-[var(--console-accent)]/40"
                >
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--console-muted)]">
                    {process.domain}
                  </p>
                  <h3 className="mt-1 text-lg font-medium text-[var(--console-ink)]">
                    {process.name}
                  </h3>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-[var(--console-ink)]">
          Add a lifecycle
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {PROCESS_TEMPLATES.map((template) => (
            <form
              key={template.key}
              action={addProcessAction}
              className="rounded-xl border border-[var(--console-line)] bg-[var(--console-surface)] p-5"
            >
              <input type="hidden" name="productId" value={product.id} />
              <input type="hidden" name="templateKey" value={template.key} />
              <h3 className="font-medium tracking-tight text-[var(--console-ink)]">
                {template.name}
              </h3>
              <p className="mt-1 text-sm text-[var(--console-muted)]">
                {template.description}
              </p>
              <p className="mt-3 text-xs text-[var(--console-muted)]">
                {template.stages.map((s) => s.name).join(" → ")}
              </p>
              <Button
                type="submit"
                className="mt-4"
                variant={usedKeys.has(template.key) ? "secondary" : "default"}
              >
                {usedKeys.has(template.key) ? "Add another" : "Add process"}
              </Button>
            </form>
          ))}
        </div>
      </section>
    </div>
  );
}
