"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Bot,
  FolderKanban,
  Plus,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import { createProductAction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
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
      return "bg-emerald-500";
    case "busy":
      return "bg-amber-500";
    case "away":
      return "bg-sky-500";
    default:
      return "bg-zinc-400";
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
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--console-line)] bg-[var(--console-surface)] px-5 py-4 md:px-7">
        <div className="animate-rise">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--console-muted)]">
            {orgName}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--console-ink)] md:text-[1.75rem]">
            Workspace
          </h1>
          <p className="mt-1 max-w-xl text-sm text-[var(--console-muted)]">
            Switch projects, see who&apos;s on the floor — people and AI agents
            together. Starting point for iteration.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="animate-rise-delay gap-1.5 bg-[var(--console-accent)] text-white hover:bg-[var(--console-accent)]/90"
          onClick={() => setShowCreate((v) => !v)}
        >
          <Plus className="size-3.5" aria-hidden />
          New project
        </Button>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto grid max-w-6xl gap-5 p-5 md:p-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.9fr)]">
          {/* Projects column */}
          <section id="projects" className="animate-rise space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FolderKanban
                  className="size-4 text-[var(--console-accent)]"
                  aria-hidden
                />
                <h2 className="text-sm font-semibold text-[var(--console-ink)]">
                  Projects
                </h2>
                <Badge variant="secondary" className="rounded-md font-normal">
                  {products.length}
                </Badge>
              </div>
              {selectedTeammate ? (
                <p className="text-xs text-[var(--console-muted)]">
                  Showing work for{" "}
                  <span className="font-medium text-[var(--console-ink)]">
                    {selectedTeammate.name}
                  </span>
                </p>
              ) : null}
            </div>

            {showCreate ? (
              <form
                action={createProductAction}
                className="space-y-3 rounded-xl border border-dashed border-[var(--console-accent)]/35 bg-[var(--console-accent-soft)]/40 p-4"
              >
                <p className="text-sm font-medium text-[var(--console-ink)]">
                  Create a project
                </p>
                <Input
                  name="name"
                  placeholder="Project or product name"
                  required
                  className="bg-[var(--console-surface)]"
                />
                <Textarea
                  name="description"
                  placeholder="What are you building together?"
                  className="min-h-16 resize-none bg-[var(--console-surface)]"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-[var(--console-accent)] text-white hover:bg-[var(--console-accent)]/90"
                  >
                    Create project
                  </Button>
                  {products.length > 0 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowCreate(false)}
                    >
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </form>
            ) : null}

            {products.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--console-line)] bg-[var(--console-surface)] px-6 py-12 text-center">
                <FolderKanban
                  className="mx-auto size-8 text-[var(--console-muted)]"
                  aria-hidden
                />
                <p className="mt-3 font-medium text-[var(--console-ink)]">
                  No projects yet
                </p>
                <p className="mt-1 text-sm text-[var(--console-muted)]">
                  Create your first project to assign teammates and open
                  processes.
                </p>
              </div>
            ) : (
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {(selectedTeammate ? productsForTeammate : products).map(
                  (product, index) => {
                    const active = product.id === selectedProductId;
                    const dimmed =
                      Boolean(selectedTeammate) &&
                      selectedTeammate!.productIds.length > 0 &&
                      !selectedTeammate!.productIds.includes(product.id);
                    const linkedCount = teammates.filter((t) =>
                      t.productIds.includes(product.id),
                    ).length;

                    return (
                      <li
                        key={product.id}
                        style={{ animationDelay: `${index * 40}ms` }}
                        className="animate-rise"
                      >
                        <button
                          type="button"
                          onClick={() => selectProduct(product.id)}
                          className={cn(
                            "group w-full rounded-xl border bg-[var(--console-surface)] p-4 text-left transition-all duration-200",
                            active
                              ? "border-[var(--console-accent)] shadow-[0_0_0_3px_var(--console-accent-soft)]"
                              : "border-[var(--console-line)] hover:border-[var(--console-accent)]/40 hover:shadow-sm",
                            dimmed && "opacity-40",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-medium tracking-tight text-[var(--console-ink)]">
                              {product.name}
                            </h3>
                            {active ? (
                              <span className="rounded-md bg-[var(--console-accent-soft)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--console-accent)]">
                                Selected
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--console-muted)]">
                            {product.description || "No description yet."}
                          </p>
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <span className="text-[11px] text-[var(--console-muted)]">
                              {linkedCount} teammate
                              {linkedCount === 1 ? "" : "s"}
                            </span>
                            <Link
                              href={`/app/products/${product.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-[11px] font-medium text-[var(--console-accent)] opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100"
                            >
                              Open →
                            </Link>
                          </div>
                        </button>
                      </li>
                    );
                  },
                )}
              </ul>
            )}

            {/* Bridge: selected project ↔ teammates */}
            {selectedProduct ? (
              <div className="animate-rise-delay rounded-xl border border-[var(--console-line)] bg-[var(--console-panel)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--console-muted)]">
                      Project ↔ teammates
                    </p>
                    <p className="mt-1 text-sm font-medium text-[var(--console-ink)]">
                      {selectedProduct.name}
                    </p>
                  </div>
                  <Link href={`/app/products/${selectedProduct.id}`}>
                    <Button size="sm" variant="outline">
                      Open floor
                    </Button>
                  </Link>
                </div>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {teammatesForProduct.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => selectTeammate(t.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition",
                          selectedTeammateId === t.id
                            ? "border-[var(--console-accent)] bg-[var(--console-accent-soft)] text-[var(--console-accent)]"
                            : "border-[var(--console-line)] bg-[var(--console-surface)] text-[var(--console-ink)] hover:border-[var(--console-accent)]/40",
                        )}
                      >
                        {t.kind === "agent" ? (
                          <Sparkles className="size-3" aria-hidden />
                        ) : (
                          <UserRound className="size-3" aria-hidden />
                        )}
                        {t.name}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-[var(--console-muted)]">
                  Click a chip to filter projects by that teammate. Placeholder
                  links — swap for real assignments later.
                </p>
              </div>
            ) : null}
          </section>

          {/* Teammates column */}
          <section id="teammates" className="animate-rise-delay space-y-4">
            <div className="flex items-center gap-2">
              <UsersIcon />
              <h2 className="text-sm font-semibold text-[var(--console-ink)]">
                Teammates
              </h2>
              <Badge variant="secondary" className="rounded-md font-normal">
                {teammates.length}
              </Badge>
            </div>
            <p className="text-xs text-[var(--console-muted)]">
              Humans and AI agents on this workspace
              {selectedProduct ? (
                <>
                  {" "}
                  · filtered for{" "}
                  <span className="font-medium text-[var(--console-ink)]">
                    {selectedProduct.name}
                  </span>
                </>
              ) : null}
            </p>

            <ul className="space-y-2">
              {teammates.map((teammate, index) => {
                const onProject =
                  !selectedProductId ||
                  teammate.productIds.includes(selectedProductId) ||
                  teammate.productIds.length === 0;
                const active = teammate.id === selectedTeammateId;

                return (
                  <li
                    key={teammate.id}
                    style={{ animationDelay: `${80 + index * 45}ms` }}
                    className="animate-rise"
                  >
                    <button
                      type="button"
                      onClick={() => selectTeammate(teammate.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border bg-[var(--console-surface)] px-3 py-3 text-left transition-all duration-200",
                        active
                          ? "border-[var(--console-accent)] shadow-[0_0_0_3px_var(--console-accent-soft)]"
                          : "border-[var(--console-line)] hover:border-[var(--console-accent)]/35",
                        !onProject && "opacity-35",
                      )}
                    >
                      <div
                        className={cn(
                          "relative flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                          teammate.kind === "agent"
                            ? "bg-[var(--console-agent)] text-[var(--console-accent)]"
                            : "bg-[var(--console-accent-soft)] text-[var(--console-accent)]",
                        )}
                      >
                        {teammate.kind === "agent" ? (
                          <Bot className="size-4" aria-hidden />
                        ) : (
                          initials(teammate.name)
                        )}
                        <span
                          className={cn(
                            "absolute bottom-0 right-0 size-2.5 rounded-full ring-2 ring-[var(--console-surface)]",
                            statusDot(teammate.status),
                          )}
                          aria-hidden
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-[var(--console-ink)]">
                            {teammate.name}
                          </p>
                          <Badge
                            variant="outline"
                            className="rounded-md px-1.5 py-0 text-[10px] font-normal capitalize"
                          >
                            {teammate.kind}
                          </Badge>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-[var(--console-muted)]">
                          {teammate.role} · {STATUS_LABEL[teammate.status]}
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

function UsersIcon() {
  return (
    <Users className="size-4 text-[var(--console-accent)]" aria-hidden />
  );
}
