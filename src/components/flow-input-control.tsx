"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FlowInputField } from "@/lib/flows/types";
import { cn } from "@/lib/utils";

/** One flow input rendered as the right control for its field type. */
export function FlowInputControl({
  field,
  value,
  onChange,
  className,
}: {
  field: FlowInputField;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const common = cn(
    "border-[var(--console-line)] bg-white text-[13px] shadow-none focus-visible:border-[var(--console-accent)] focus-visible:ring-[var(--console-accent-ring)]",
    className,
  );

  if (field.type === "text") {
    return (
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        required={field.required !== false}
        className={cn("min-h-24 resize-y", common)}
      />
    );
  }

  if (field.type === "select") {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={field.required !== false}
        className={cn(
          "flex h-9 w-full rounded-md border px-3 text-[13px] outline-none",
          common,
        )}
      >
        <option value="">Select…</option>
        {(field.options ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <Input
      type={field.type === "url" ? "url" : "text"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      required={field.required !== false}
      className={cn("h-9", common)}
    />
  );
}
