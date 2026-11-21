"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { GitPullRequest, Loader2 } from "lucide-react";
import { disconnectGithubOauthAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

type Props = {
  oauthAppConfigured: boolean;
  connected: boolean;
  accountLogin?: string;
  accountAvatarUrl?: string;
  scope?: string;
  error?: string | null;
  justConnected?: boolean;
};

export function GithubOauthCard({
  oauthAppConfigured,
  connected,
  accountLogin,
  accountAvatarUrl,
  scope,
  error,
  justConnected,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function disconnect() {
    startTransition(async () => {
      await disconnectGithubOauthAction();
      router.refresh();
    });
  }

  return (
    <section className="overflow-hidden rounded-xl bg-[var(--console-surface)] shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)]">
      <div className="border-b border-[var(--console-line)] px-4 py-3">
        <div className="flex items-center gap-2">
          <GitPullRequest
            className="size-3.5 text-[var(--console-ink)]"
            aria-hidden
          />
          <h2 className="text-[13px] font-semibold text-[var(--console-ink)]">
            GitHub account
          </h2>
          {connected ? (
            <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
              Connected
            </span>
          ) : (
            <span className="rounded-md bg-[var(--console-panel)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--console-muted)]">
              Not connected
            </span>
          )}
        </div>
        <p className="mt-1 text-[12px] text-[var(--console-muted)]">
          Authorize Consol with GitHub so this workspace can open draft pull
          requests. No product is required to connect.
        </p>
      </div>

      <div className="space-y-3 px-4 py-4">
        {error ? (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-700">
            {error === "oauth_not_configured"
              ? "GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET."
              : decodeURIComponent(error)}
          </div>
        ) : null}
        {justConnected ? (
          <div className="rounded-lg bg-[var(--console-accent-soft)] px-3 py-2 text-[12px] text-[var(--console-accent)]">
            GitHub connected
            {accountLogin ? ` as @${accountLogin}` : ""}.
          </div>
        ) : null}

        {!oauthAppConfigured ? (
          <div className="rounded-lg bg-[var(--console-panel)] px-3 py-3 text-[12px] text-[var(--console-muted)]">
            <p className="font-medium text-[var(--console-ink)]">
              OAuth app credentials required
            </p>
            <p className="mt-1">
              Create a GitHub OAuth App and set{" "}
              <code className="rounded bg-white px-1 py-0.5 text-[11px]">
                GITHUB_CLIENT_ID
              </code>{" "}
              and{" "}
              <code className="rounded bg-white px-1 py-0.5 text-[11px]">
                GITHUB_CLIENT_SECRET
              </code>
              . Callback URL:{" "}
              <code className="rounded bg-white px-1 py-0.5 text-[11px]">
                /api/connectors/github/oauth/callback
              </code>
            </p>
          </div>
        ) : null}

        {connected ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              {accountAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={accountAvatarUrl}
                  alt=""
                  className="size-8 rounded-full ring-1 ring-[var(--console-line)]"
                />
              ) : (
                <span className="flex size-8 items-center justify-center rounded-full bg-[var(--console-panel)] text-[11px] font-semibold text-[var(--console-ink)] ring-1 ring-[var(--console-line)]">
                  {(accountLogin ?? "GH").slice(0, 2).toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-[var(--console-ink)]">
                  @{accountLogin || "github"}
                </p>
                <p className="truncate text-[11px] text-[var(--console-faint)]">
                  {scope ? `Scopes: ${scope}` : "OAuth connected"}
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={disconnect}
              className="h-8 rounded-md text-[12px]"
            >
              {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={!oauthAppConfigured || pending}
              className="h-8 rounded-md bg-[var(--console-ink)] text-[12px] text-white hover:bg-[var(--console-accent)]"
              onClick={() => {
                window.location.href = "/api/connectors/github/oauth/start";
              }}
            >
              <GitPullRequest className="size-3.5" />
              Connect with GitHub
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
