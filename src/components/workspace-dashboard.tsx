"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Bot,
  FolderKanban,
  Plus,
  Sparkles,
  UserRound,
} from "lucide-react";
import { createProductAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/factory";

export type TeammatePlaceHolder = {
  id: string;
  name: string;
  role: string;
  kind: "human" | "agent";
  status: "online" | "away" | "busy" | "ready" | "idle";
  /** Product ids this teammate is linked to (placeholder wiring). */
  productIds: string[];
  email?: string;
  /** Agent registry slug when kind is agent. */
  slug?: string;
};

const STATUS_LABEL: Record<TeammatePlaceHolder["status"], string> = {
  online: "Online",
  away: "Away",
  busy: "Busy",
  ready: "Ready",
  idle: "Idle",
};

function statusDot(status: TeammatePlaceHolder["status"]) {
  switch (status) {
    case "online":
    case "ready":
      return "bg-indigo-500";
    case "busy":
      return "bg-amber-500";
    case "away":
      return "bg-zinc-400";
    default:
      return "bg-zinc-300";
  }
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function WorkspaceDashboard({
  orgName,
  products,
  teammates,
}: {
  orgName: string;
  products: Product[];
  teammates: TeammatePlaceHolder[];
}) {
  const router = useRouter();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    products[0]?.id ?? null,
  );
  const [selectedTeammateId, setSelectedTeammateId] = useState<string | null>(
    null,
  );
  const [showCreate, setShowCreate] = useState(products.length === 0);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  const selectedTeammate = useMemo(
    () => teammates.find((t) => t.id === selectedTeammateId) ?? null,
    [teammates, selectedTeammateId],
  );

  const teammatesForProduct = useMemo(() => {
    if (!selectedProductId) return teammates;
    return teammates.filter(
      (t) =>
        t.productIds.includes(selectedProductId) || t.productIds.length === 0,
    );
  }, [teammates, selectedProductId]);

  const productsForTeammate = useMemo(() => {
    if (!selectedTeammate) return products;
    if (selectedTeammate.productIds.length === 0) return products;
    return products.filter((p) => selectedTeammate.productIds.includes(p.id));
  }, [products, selectedTeammate]);

  function selectProduct(id: string) {
    setSelectedProductId(id);
    setSelectedTeammateId(null);
  }

  function selectTeammate(id: string) {
    setSelectedTeammateId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between gap-4 px-5 py-5 md:px-8 md:py-6">
        <div className="animate-rise min-w-0">
          <p className="text-[12px] text-[var(--console-faint)]">{orgName}</p>
          <h1 className="mt-0.5 text-[22px] font-semibold tracking-tight text-[var(--console-ink)]">
            Projects
          </h1>
        </div>
        <Button
          type="button"
          size="sm"
          className="animate-rise-delay h-8 gap-1.5 rounded-md bg-[var(--console-ink)] px-3 text-[12px] text-white hover:bg-[var(--console-accent)]"
          onClick={() => setShowCreate((v) => !v)}
        >
          <Plus className="size-3.5" aria-hidden />
          New project
        </Button>
      </header>

      <div className="flex-1 overflow-auto px-5 pb-8 md:px-8">
        <div className="mx-auto grid max-w-[1100px] gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.85fr)] lg:gap-6">
          <div className="space-y-5">
            <section
              id="projects"
              className="animate-rise overflow-hidden rounded-xl bg-[var(--console-surface)] shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)]"
            >
              <div className="flex items-center justify-between gap-3 border-b border-[var(--console-line)] px-4 py-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-[13px] font-semibold text-[var(--console-ink)]">
                    Projects
                  </h2>
                  <span className="rounded-full bg-[var(--console-panel)] px-1.5 py-0.5 text-[11px] tabular-nums text-[var(--console-muted)]">
                    {products.length}
                  </span>
                </div>
                {selectedTeammate ? (
                  <p className="truncate text-[12px] text-[var(--console-muted)]">
                    For{" "}
                    <span className="text-[var(--console-ink)]">
                      {selectedTeammate.name}
                    </span>
                  </p>
                ) : (
                  <p className="text-[12px] text-[var(--console-faint)]">
                    Select to assign teammates
                  </p>
                )}
              </div>

              {showCreate ? (
                <form
                  action={createProductAction}
                  className="space-y-3 border-b border-[var(--console-line)] bg-[var(--console-panel)]/60 px-4 py-4"
                >
                  <Input
                    name="name"
                    placeholder="Project name"
                    required
                    className="h-9 rounded-md border-[var(--console-line)] bg-white text-[13px]"
                  />
                  <Textarea
                    name="description"
                    placeholder="Short description"
                    className="min-h-14 resize-none rounded-md border-[var(--console-line)] bg-white text-[13px]"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      className="h-8 rounded-md bg-[var(--console-ink)] text-[12px] text-white hover:bg-[var(--console-accent)]"
                    >
                      Create
                    </Button>
                    {products.length > 0 ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 text-[12px]"
                        onClick={() => setShowCreate(false)}
                      >
                        Cancel
                      </Button>
                    ) : null}
                  </div>
                </form>
              ) : null}

              {products.length === 0 ? (
                <div className="px-4 py-14 text-center">
                  <FolderKanban
                    className="mx-auto size-7 text-[var(--console-faint)]"
                    aria-hidden
                  />
                  <p className="mt-3 text-[13px] font-medium text-[var(--console-ink)]">
                    No projects yet
                  </p>
                  <p className="mt-1 text-[12px] text-[var(--console-muted)]">
                    Create one to start linking teammates.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--console-line)]">
                  {(selectedTeammate ? productsForTeammate : products).map(
                    (product) => {
                      const active = product.id === selectedProductId;
                      const dimmed =
                        Boolean(selectedTeammate) &&
                        selectedTeammate!.productIds.length > 0 &&
                        !selectedTeammate!.productIds.includes(product.id);
                      const linkedCount = teammates.filter((t) =>
                        t.productIds.includes(product.id),
                      ).length;

                      return (
                        <li key={product.id}>
                          <button
                            type="button"
                            onClick={() => selectProduct(product.id)}
                            className={cn(
                              "group flex w-full items-start gap-3 border-l-2 px-4 py-3.5 text-left transition-colors",
                              active
                                ? "border-l-[var(--console-accent)] bg-[var(--console-accent-soft)]"
                                : "border-l-transparent hover:bg-[var(--console-hover)]",
                              dimmed && "opacity-40",
                            )}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2">
                                <span className="truncate text-[13px] font-medium text-[var(--console-ink)]">
                                  {product.name}
                                </span>
                                {active ? (
                                  <span className="text-[11px] font-medium text-[var(--console-accent)]">
                                    Active
                                  </span>
                                ) : null}
                              </span>
                              <span className="mt-0.5 line-clamp-1 block text-[12px] text-[var(--console-muted)]">
                                {product.description || "No description yet."}
                              </span>
                              <span className="mt-2 flex items-center gap-3 text-[11px] text-[var(--console-faint)]">
                                <span>
                                  {linkedCount} teammate
                                  {linkedCount === 1 ? "" : "s"}
                                </span>
                                <Link
                                  href={`/app/products/${product.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-0.5 font-medium text-[var(--console-accent)] opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"
                                >
                                  Open
                                  <ArrowUpRight
                                    className="size-3"
                                    aria-hidden
                                  />
                                </Link>
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    },
                  )}
                </ul>
              )}
            </section>

            {selectedProduct ? (
              <section className="animate-rise-delay rounded-xl bg-[var(--console-surface)] px-4 py-4 shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] text-[var(--console-faint)]">
                      Linked teammates
                    </p>
                    <p className="truncate text-[13px] font-medium text-[var(--console-ink)]">
                      {selectedProduct.name}
                    </p>
                  </div>
                  <Link href={`/app/products/${selectedProduct.id}`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-md border-[var(--console-line)] bg-white text-[12px] shadow-none hover:bg-[var(--console-hover)]"
                    >
                      Open floor
                    </Button>
                  </Link>
                </div>
                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {teammatesForProduct.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => selectTeammate(t.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] transition",
                          selectedTeammateId === t.id
                            ? "bg-[var(--console-ink)] text-white"
                            : "bg-[var(--console-panel)] text-[var(--console-ink)] hover:bg-[var(--console-line)]",
                        )}
                      >
                        {t.kind === "agent" ? (
                          <Sparkles className="size-3 opacity-70" aria-hidden />
                        ) : (
                          <UserRound
                            className="size-3 opacity-70"
                            aria-hidden
                          />
                        )}
                        {t.name}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[11px] leading-relaxed text-[var(--console-faint)]">
                  Click a person to filter projects. Agent teammates open chat.
                </p>
              </section>
            ) : null}
          </div>

          <section
            id="teammates"
            className="animate-rise-delay overflow-hidden rounded-xl bg-[var(--console-surface)] shadow-[var(--console-shadow)] ring-1 ring-[var(--console-line)]"
          >
            <div className="border-b border-[var(--console-line)] px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-[13px] font-semibold text-[var(--console-ink)]">
                    Teammates
                  </h2>
                  <span className="rounded-full bg-[var(--console-panel)] px-1.5 py-0.5 text-[11px] tabular-nums text-[var(--console-muted)]">
                    {teammates.length}
                  </span>
                </div>
                <Link
                  href="/app/teammates/new"
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--console-accent)] hover:text-[var(--console-accent-hover)]"
                >
                  <Plus className="size-3" aria-hidden />
                  Create
                </Link>
              </div>
              <p className="mt-1 text-[12px] text-[var(--console-faint)]">
                {selectedProduct
                  ? `Showing links for ${selectedProduct.name}`
                  : "People and AI agents"}
              </p>
            </div>

            <ul className="divide-y divide-[var(--console-line)]">
              {teammates.length === 0 ? (
                <li className="px-4 py-10 text-center">
                  <p className="text-[13px] font-medium text-[var(--console-ink)]">
                    No teammates yet
                  </p>
                  <p className="mt-1 text-[12px] text-[var(--console-muted)]">
                    Create an agent teammate from a preset or blank.
                  </p>
                  <Link href="/app/teammates/new" className="mt-3 inline-block">
                    <Button
                      size="sm"
                      className="h-8 rounded-md bg-[var(--console-ink)] text-[12px] text-white hover:bg-[var(--console-accent)]"
                    >
                      Create teammate
                    </Button>
                  </Link>
                </li>
              ) : null}
              {teammates.map((teammate) => {
                const onProject =
                  !selectedProductId ||
                  teammate.productIds.includes(selectedProductId) ||
                  teammate.productIds.length === 0;
                const active = teammate.id === selectedTeammateId;

                return (
                  <li key={teammate.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (teammate.kind === "agent" && teammate.slug) {
                          router.push(`/app/teammates/${teammate.slug}`);
                          return;
                        }
                        selectTeammate(teammate.id);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition-colors",
                        active
                          ? "border-l-[var(--console-accent)] bg-[var(--console-accent-soft)]"
                          : "border-l-transparent hover:bg-[var(--console-hover)]",
                        !onProject && "opacity-35",
                      )}
                    >
                      <div
                        className={cn(
                          "relative flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                          teammate.kind === "agent"
                            ? "bg-[var(--console-agent)] text-[var(--console-accent)]"
                            : "bg-[var(--console-panel)] text-[var(--console-ink)]",
                        )}
                      >
                        {teammate.kind === "agent" ? (
                          <Bot className="size-3.5" aria-hidden />
                        ) : (
                          initials(teammate.name)
                        )}
                        <span
                          className={cn(
                            "absolute bottom-0 right-0 size-2 rounded-full ring-2 ring-white",
                            statusDot(teammate.status),
                          )}
                          aria-hidden
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[13px] font-medium text-[var(--console-ink)]">
                            {teammate.name}
                          </p>
                          <span
                            className={cn(
                              "rounded px-1 py-px text-[10px] font-medium capitalize",
                              teammate.kind === "agent"
                                ? "bg-[var(--console-agent)] text-[var(--console-accent)]"
                                : "bg-amber-50 text-amber-700",
                            )}
                          >
                            {teammate.kind}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-[12px] text-[var(--console-muted)]">
                          {teammate.role}
                          <span className="text-[var(--console-faint)]">
                            {" "}
                            · {STATUS_LABEL[teammate.status]}
                          </span>
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
