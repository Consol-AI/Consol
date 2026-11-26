"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { ModelOption } from "@/lib/models";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "consol.modelRef";

type Props = {
  options: ModelOption[];
  /** Server-resolved primary when no local override is set. */
  defaultRef: string | null;
  value: string | null;
  onChange: (ref: string | null) => void;
  className?: string;
  /** Compact inline select for chat composers. */
  compact?: boolean;
};

function subscribeStorage(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) onStoreChange();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

/** Persist the user's provider pick across reloads (per browser). */
export function readStoredModelRef(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)?.trim();
    return value || null;
  } catch {
    return null;
  }
}

export function writeStoredModelRef(ref: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (!ref) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, ref);
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  } catch {
    // private mode / blocked storage
  }
}

export function ModelPicker({
  options,
  defaultRef,
  value,
  onChange,
  className,
  compact = false,
}: Props) {
  if (options.length === 0) {
    return (
      <p
        className={cn(
          "text-[11px] text-[var(--console-faint)]",
          className,
        )}
      >
        No model keys configured
      </p>
    );
  }

  const selected = value ?? defaultRef ?? options[0]!.ref;

  return (
    <label
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] text-[var(--console-faint)]",
        className,
      )}
    >
      <span className={compact ? "sr-only" : undefined}>Model</span>
      <select
        value={selected}
        onChange={(e) => {
          const next = e.target.value;
          onChange(next);
          writeStoredModelRef(next);
        }}
        className={cn(
          "max-w-[14rem] truncate rounded-md border border-[var(--console-line)] bg-[var(--console-panel)]/60 px-1.5 py-1 font-mono text-[11px] text-[var(--console-ink)] outline-none focus-visible:border-[var(--console-accent)]",
          compact && "py-0.5",
        )}
        aria-label="Model provider"
      >
        {options.map((option) => (
          <option key={option.ref} value={option.ref}>
            {option.label} · {option.ref}
          </option>
        ))}
      </select>
    </label>
  );
}

function isUsableRef(options: ModelOption[], stored: string | null): boolean {
  if (!stored) return false;
  const provider = stored.split(":")[0];
  return options.some((o) => o.ref === stored || o.provider === provider);
}

/** Hydrate localStorage preference without an effect (SSR-safe). */
export function usePreferredModelRef(
  options: ModelOption[],
  serverDefault: string | null,
): [string | null, (ref: string | null) => void] {
  const stored = useSyncExternalStore(
    subscribeStorage,
    readStoredModelRef,
    () => null,
  );

  const ref =
    isUsableRef(options, stored) ? stored : serverDefault;

  const setRef = useCallback((next: string | null) => {
    writeStoredModelRef(next);
  }, []);

  return [ref, setRef];
}
