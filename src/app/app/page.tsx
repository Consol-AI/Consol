import Link from "next/link";
import { createProductAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getViewer } from "@/lib/auth";
import { ensureWorkspace, listProducts } from "@/lib/factory";

export default async function AppHomePage() {
  const viewer = await getViewer();
  if (!viewer) {
    return (
      <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-8 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          Sign in required
        </h1>
        <p className="mt-2 text-[var(--quiet)]">
          Consol uses your Cursor identity when published as a private or team
          app. Locally, a simulated teammate is already active — refresh if you
          toggled the signed-out state.
        </p>
      </div>
    );
  }

  const org = await ensureWorkspace(viewer);
  const products = await listProducts(org.id);

  return (
    <div className="space-y-10">
      <div>
        <p className="text-sm uppercase tracking-[0.14em] text-[var(--quiet)]">
          {org.name}
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-4xl tracking-tight">
          Products
        </h1>
        <p className="mt-2 max-w-2xl text-[var(--quiet)]">
          Each product is a shared floor. Attach the lifecycles your teams
          actually run — then move work with AI in the loop.
        </p>
      </div>

      <form
        action={createProductAction}
        className="grid gap-3 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-4 md:grid-cols-[1.2fr_1.8fr_auto]"
      >
        <Input name="name" placeholder="Product name" required />
        <Textarea
          name="description"
          placeholder="What are you building together?"
          className="min-h-10 resize-none"
        />
        <Button type="submit">Create product</Button>
      </form>

      {products.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--line)] px-6 py-14 text-center">
          <p className="font-[family-name:var(--font-display)] text-2xl">
            No products yet
          </p>
          <p className="mt-2 text-sm text-[var(--quiet)]">
            Create your first product workspace to start linking processes.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {products.map((product) => (
            <li key={product.id}>
              <Link
                href={`/app/products/${product.id}`}
                className="block rounded-lg border border-[var(--line)] bg-[var(--panel)] p-5 transition hover:border-[var(--ink)]"
              >
                <h2 className="text-lg font-medium tracking-tight">
                  {product.name}
                </h2>
                <p className="mt-1 line-clamp-2 text-sm text-[var(--quiet)]">
                  {product.description || "No description yet."}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
