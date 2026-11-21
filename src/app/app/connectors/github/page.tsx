import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  GithubIntegrationForm,
  type GithubProductOption,
} from "@/components/github-integration-form";
import { GithubOauthCard } from "@/components/github-oauth-card";
import { getViewer } from "@/lib/auth";
import { ensureWorkspace, listProducts } from "@/lib/factory";
import {
  getProductIntegration,
  parseGithubConfig,
} from "@/lib/integrations";
import { getPublicOrganizationConnection } from "@/lib/integrations/connections";
import { githubOAuthConfigured } from "@/lib/integrations/github/oauth";

export default async function GithubConnectorPage({
  searchParams,
}: {
  searchParams: Promise<{
    product?: string;
    error?: string;
    connected?: string;
  }>;
}) {
  const viewer = await getViewer();
  const {
    product: productParam,
    error,
    connected: connectedParam,
  } = await searchParams;
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
  const [products, oauthConnection] = await Promise.all([
    listProducts(org.id),
    getPublicOrganizationConnection(org.id, "github"),
  ]);

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

  const oauthConnected =
    oauthConnection?.status === "connected" &&
    Boolean(oauthConnection.account_login);

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
          Connect a GitHub account to this workspace via OAuth, then optionally
          bind default repositories to products.
        </p>
      </div>

      <GithubOauthCard
        oauthAppConfigured={githubOAuthConfigured()}
        connected={oauthConnected}
        accountLogin={oauthConnection?.account_login}
        accountAvatarUrl={oauthConnection?.account_avatar_url}
        scope={oauthConnection?.scope}
        error={error ?? null}
        justConnected={connectedParam === "1"}
      />

      <GithubIntegrationForm
        products={options}
        initialProductId={productParam}
        oauthConnected={oauthConnected}
      />
    </div>
  );
}
