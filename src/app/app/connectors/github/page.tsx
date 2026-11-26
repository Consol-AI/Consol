import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GithubOauthCard } from "@/components/github-oauth-card";
import { getViewer } from "@/lib/auth";
import { ensureWorkspace } from "@/lib/factory";
import { getGithubTokenWithSource, resolveRepo } from "@/lib/integrations/local";
import { getPublicOrganizationConnection } from "@/lib/integrations/connections";
import { githubOAuthConfigured } from "@/lib/integrations/github/oauth";

export default async function GithubConnectorPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    connected?: string;
  }>;
}) {
  const viewer = await getViewer();
  const { error, connected: connectedParam } = await searchParams;
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
  const [oauthConnection, repo, token] = await Promise.all([
    getPublicOrganizationConnection(org.id, "github"),
    resolveRepo(),
    getGithubTokenWithSource(org.id),
  ]);
  const tokenLabel = !token
    ? "None — PRs, checks and merges run as dry-runs. Run gh auth login or set GITHUB_TOKEN."
    : token.source === "oauth"
      ? "Workspace OAuth connection"
      : token.source === "env"
        ? "GITHUB_TOKEN / GH_TOKEN from the environment"
        : "Your local gh CLI login (gh auth token)";
  const repoLabel = repo
    ? `${repo.owner}/${repo.repo} (base ${repo.baseBranch}) — from ${
        repo.source === "env" ? "CONSOL_GITHUB_REPO" : "this checkout's git origin"
      }`
    : "None found — set CONSOL_GITHUB_REPO=owner/repo in .env.local";

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
          Consol uses your local git remote and gh login by default. A work
          item can target another repo via its Repository input; OAuth is
          optional.
        </p>
      </div>

      <dl className="grid gap-3 rounded-xl bg-[var(--console-surface)] p-5 text-[13px] shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)]">
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--console-faint)]">
            Default repository
          </dt>
          <dd className="mt-1 text-[var(--console-ink)]">{repoLabel}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--console-faint)]">
            Credentials
          </dt>
          <dd className="mt-1 text-[var(--console-ink)]">{tokenLabel}</dd>
        </div>
      </dl>

      <GithubOauthCard
        oauthAppConfigured={githubOAuthConfigured()}
        connected={oauthConnected}
        accountLogin={oauthConnection?.account_login}
        accountAvatarUrl={oauthConnection?.account_avatar_url}
        scope={oauthConnection?.scope}
        error={error ?? null}
        justConnected={connectedParam === "1"}
      />
    </div>
  );
}
