import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  GithubIntegrationForm,
  type GithubProductOption,
} from "@/components/github-integration-form";
import { getViewer } from "@/lib/auth";
import { ensureWorkspace, listProducts } from "@/lib/factory";
import {
  getProductIntegration,
  githubAuthConfigured,
  parseGithubConfig,
} from "@/lib/integrations";

export default async function GithubConnectorPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const viewer = await getViewer();
  const { product: productParam } = await searchParams;
  if (!viewer) {
    return (
      <div className="m-6 rounded-xl bg-[var(--console-surface)] p-8 text-center shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)] md:m-10">
        <h1 className="text-[22px] font-semibold tracking-tight text-[var(--console-ink)]">
          Sign in required
        </h1>
      </div>
    );
  }

  const org = await ensureWorkspace(viewer);
  const products = await listProducts(org.id);
  const options: GithubProductOption[] = await Promise.all(
    products.map(async (product) => {
      const integration = await getProductIntegration(product.id, "github");
      const config = integration ? parseGithubConfig(integration.config) : null;
      return {
        id: product.id,
        name: product.name,
        owner: config?.owner,
        repo: config?.repo,
        baseBranch: config?.baseBranch,
        headBranchPrefix: config?.headBranchPrefix,
        connected: Boolean(config),
      };
    }),
  );

  const linked = options.filter((p) => p.connected).length;

  return (
    <div className="mx-auto w-full max-w-[720px] space-y-6 px-5 py-6 md:px-8 md:py-8">
      <div>
        <Link
          href="/app/connectors"
          className="inline-flex items-center gap-1.5 text-[12px] text-[var(--console-faint)] transition hover:text-[var(--console-accent)]"
        >
          <ArrowLeft className="size-3" />
          Connectors
        </Link>
        <h1 className="mt-2 text-[22px] font-semibold tracking-tight text-[var(--console-ink)]">
          GitHub
        </h1>
        <p className="mt-1 max-w-xl text-[13px] text-[var(--console-muted)]">
          Link repositories so software delivery can open draft pull requests
          from work items.
        </p>
        <p className="mt-2 text-[12px] text-[var(--console-faint)]">
          {linked} of {options.length} product{options.length === 1 ? "" : "s"}{" "}
          linked
          {githubAuthConfigured()
            ? " · live token configured"
            : " · dry-run mode"}
        </p>
      </div>

      <GithubIntegrationForm
        products={options}
        initialProductId={productParam}
        authConfigured={githubAuthConfigured()}
      />
    </div>
  );
}
