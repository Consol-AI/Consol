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
    <div className="space-y-10">
      <div>
        <Link href="/app" className="text-sm text-[var(--quiet)] hover:underline">
          ← Products
        </Link>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight">
          {product.name}
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--quiet)]">
          {product.description ||
            "Link the professional lifecycles this product needs."}
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-tight">
          Processes on this floor
        </h2>
        {processes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--line)] px-6 py-10 text-center">
            <p className="text-[var(--quiet)]">
              No processes yet. Add a template below to open the first board.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {processes.map((process) => (
              <li key={process.id}>
                <Link
                  href={`/app/products/${product.id}/processes/${process.id}`}
                  className="block rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 transition hover:border-[var(--ink)]"
                >
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--quiet)]">
                    {process.domain}
                  </p>
                  <h3 className="mt-1 text-lg font-medium">{process.name}</h3>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-tight">
          Add a lifecycle
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {PROCESS_TEMPLATES.map((template) => (
            <form
              key={template.key}
              action={addProcessAction}
              className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5"
            >
              <input type="hidden" name="productId" value={product.id} />
              <input type="hidden" name="templateKey" value={template.key} />
              <h3 className="font-medium tracking-tight">{template.name}</h3>
              <p className="mt-1 text-sm text-[var(--quiet)]">
                {template.description}
              </p>
              <p className="mt-3 text-xs text-[var(--quiet)]">
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
