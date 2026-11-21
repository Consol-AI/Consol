"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GitPullRequest, Loader2 } from "lucide-react";
import {
  clearGithubIntegrationAction,
  saveGithubIntegrationAction,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  productId: string;
  initialOwner?: string;
  initialRepo?: string;
  initialBaseBranch?: string;
  initialHeadBranchPrefix?: string;
  connected: boolean;
  authConfigured: boolean;
};

export function GithubIntegrationForm({
  productId,
  initialOwner = "",
  initialRepo = "",
  initialBaseBranch = "main",
  initialHeadBranchPrefix = "consol/",
  connected,
  authConfigured,
}: Props) {
  const router = useRouter();
  const [owner, setOwner] = useState(initialOwner);
  const [repo, setRepo] = useState(initialRepo);
  const [baseBranch, setBaseBranch] = useState(initialBaseBranch);
  const [headBranchPrefix, setHeadBranchPrefix] = useState(
    initialHeadBranchPrefix,
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function save() {
    setError(null);
    setNotice(null);
    const formData = new FormData();
    formData.set("productId", productId);
    formData.set("owner", owner);
    formData.set("repo", repo);
    formData.set("baseBranch", baseBranch);
    formData.set("headBranchPrefix", headBranchPrefix);
    startTransition(async () => {
      try {
        await saveGithubIntegrationAction(formData);
        setNotice("GitHub repository linked.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save GitHub link.");
      }
    });
  }

  function clear() {
    setError(null);
    setNotice(null);
    const formData = new FormData();
    formData.set("productId", productId);
    startTransition(async () => {
      try {
        await clearGithubIntegrationAction(formData);
        setOwner("");
        setRepo("");
        setBaseBranch("main");
        setHeadBranchPrefix("consol/");
        setNotice("GitHub link removed.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not remove GitHub link.");
      }
    });
  }

  return (
    <section className="overflow-hidden rounded-xl bg-[var(--console-surface)] shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)]">
      <div className="border-b border-[var(--console-line)] px-4 py-3">
        <div className="flex items-center gap-2">
          <GitPullRequest className="size-3.5 text-[var(--console-ink)]" aria-hidden />
          <h2 className="text-[13px] font-semibold text-[var(--console-ink)]">
            GitHub
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
          Link a repository so the software delivery flow can open draft pull
          requests.
        </p>
      </div>

      <div className="space-y-3 px-4 py-4">
        {error || notice ? (
          <div
            className={cn(
              "rounded-lg px-3 py-2 text-[12px]",
              error
                ? "bg-red-50 text-red-700"
                : "bg-[var(--console-accent-soft)] text-[var(--console-accent)]",
            )}
          >
            {error ?? notice}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-[11px] font-medium text-[var(--console-faint)]">
              Owner
            </span>
            <Input
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="acme"
              className="h-9"
              disabled={pending}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-medium text-[var(--console-faint)]">
              Repository
            </span>
            <Input
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="widget-api"
              className="h-9"
              disabled={pending}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-medium text-[var(--console-faint)]">
              Base branch
            </span>
            <Input
              value={baseBranch}
              onChange={(e) => setBaseBranch(e.target.value)}
              placeholder="main"
              className="h-9"
              disabled={pending}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-[11px] font-medium text-[var(--console-faint)]">
              Head branch prefix
            </span>
            <Input
              value={headBranchPrefix}
              onChange={(e) => setHeadBranchPrefix(e.target.value)}
              placeholder="consol/"
              className="h-9"
              disabled={pending}
            />
          </label>
        </div>

        <p className="text-[11px] text-[var(--console-faint)]">
          {authConfigured
            ? "GITHUB_TOKEN is set — Open PR will create a real draft pull request."
            : "No GITHUB_TOKEN — Open PR runs in dry-run mode and records a placeholder link."}
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={pending || !owner.trim() || !repo.trim()}
            onClick={save}
            className="h-8 rounded-md bg-[var(--console-ink)] text-[12px] text-white hover:bg-[var(--console-accent)]"
          >
            {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {connected ? "Update repository" : "Connect repository"}
          </Button>
          {connected ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={clear}
              className="h-8 rounded-md text-[12px]"
            >
              Disconnect
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
