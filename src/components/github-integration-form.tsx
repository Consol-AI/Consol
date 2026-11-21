"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GitPullRequest, Loader2 } from "lucide-react";
import {
  clearGithubIntegrationAction,
  saveGithubIntegrationAction,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type GithubProductOption = {
  id: string;
  name: string;
  owner?: string;
  repo?: string;
  baseBranch?: string;
  headBranchPrefix?: string;
  connected: boolean;
};

type Props = {
  products: GithubProductOption[];
  initialProductId?: string;
  authConfigured: boolean;
};

export function GithubIntegrationForm({
  products,
  initialProductId,
  authConfigured,
}: Props) {
  const router = useRouter();
  const fallbackId = products[0]?.id ?? "";
  const [productId, setProductId] = useState(
    initialProductId && products.some((p) => p.id === initialProductId)
      ? initialProductId
      : fallbackId,
  );
  const selected = useMemo(
    () => products.find((p) => p.id === productId) ?? null,
    [products, productId],
  );

  const [owner, setOwner] = useState(selected?.owner ?? "");
  const [repo, setRepo] = useState(selected?.repo ?? "");
  const [baseBranch, setBaseBranch] = useState(selected?.baseBranch ?? "main");
  const [headBranchPrefix, setHeadBranchPrefix] = useState(
    selected?.headBranchPrefix ?? "consol/",
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setOwner(selected?.owner ?? "");
    setRepo(selected?.repo ?? "");
    setBaseBranch(selected?.baseBranch ?? "main");
    setHeadBranchPrefix(selected?.headBranchPrefix ?? "consol/");
    setError(null);
    setNotice(null);
  }, [selected]);

  function save() {
    if (!selected) return;
    setError(null);
    setNotice(null);
    const formData = new FormData();
    formData.set("productId", selected.id);
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
        setError(
          err instanceof Error ? err.message : "Could not save GitHub link.",
        );
      }
    });
  }

  function clear() {
    if (!selected) return;
    setError(null);
    setNotice(null);
    const formData = new FormData();
    formData.set("productId", selected.id);
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
        setError(
          err instanceof Error ? err.message : "Could not remove GitHub link.",
        );
      }
    });
  }

  if (products.length === 0) {
    return (
      <section className="overflow-hidden rounded-xl bg-[var(--console-surface)] shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)]">
        <div className="px-4 py-10 text-center">
          <GitPullRequest
            className="mx-auto size-7 text-[var(--console-faint)]"
            aria-hidden
          />
          <p className="mt-3 text-[13px] font-medium text-[var(--console-ink)]">
            Create a product first
          </p>
          <p className="mt-1 text-[12px] text-[var(--console-muted)]">
            GitHub repos are linked per product so software delivery knows where
            to open pull requests.
          </p>
          <Button
            type="button"
            size="sm"
            className="mt-4 h-8 rounded-md text-[12px]"
            variant="outline"
            onClick={() => router.push("/app/projects")}
          >
            Open projects
          </Button>
        </div>
      </section>
    );
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
            Repository binding
          </h2>
          {selected?.connected ? (
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
          Choose a product, then link the GitHub repository used by its
          software delivery flow.
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

        <label className="block space-y-1.5">
          <span className="text-[11px] font-medium text-[var(--console-faint)]">
            Product
          </span>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            disabled={pending}
            className="h-9 w-full rounded-md border border-[var(--console-line)] bg-white px-2.5 text-[13px] text-[var(--console-ink)] outline-none focus-visible:border-[var(--console-accent)] focus-visible:ring-3 focus-visible:ring-[var(--console-accent-ring)]"
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
                {product.connected && product.owner && product.repo
                  ? ` — ${product.owner}/${product.repo}`
                  : ""}
              </option>
            ))}
          </select>
        </label>

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
            {selected?.connected ? "Update repository" : "Connect repository"}
          </Button>
          {selected?.connected ? (
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
