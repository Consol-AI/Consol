import {
  anthropicConfigured,
  anthropicModel,
  DEFAULT_ANTHROPIC_MODEL,
} from "@/lib/models/anthropic";
import { claudeCliConfigured, claudeCliModel } from "@/lib/models/claude-cli";
import { withFailover } from "@/lib/models/failover";
import {
  DEFAULT_OPENAI_MODEL,
  gatewayConfigured,
  openaiCompatibleModel,
  openaiConfigured,
} from "@/lib/models/openai";
import { readModelPreferenceSync } from "@/lib/models/preference";
import type { TextModel } from "@/lib/models/types";

export type * from "@/lib/models/types";
export { isRetryableProviderError } from "@/lib/models/errors";
export {
  clearModelPreference,
  readModelPreference,
  writeModelPreference,
} from "@/lib/models/preference";

/**
 * Models are interchangeable by ref "<provider>:<model>":
 *   anthropic:claude-opus-5-5 · claude-cli[:<model>] · openai:gpt-4o-mini · gateway:<model>
 *
 * Resolution order for the primary model:
 *   1. explicit `ref` (per-stage / request override)
 *   2. workspace preference (`data/model-preference.json`)
 *   3. CONSOL_MODEL
 *   4. first configured provider (anthropic → claude-cli → openai → gateway)
 *
 * After the primary, failover tries CONSOL_MODEL_FALLBACKS (comma-separated
 * refs), then any other configured providers — so Claude rate limits can
 * hand off to OpenAI / Gateway without waiting out the hour.
 */
const PROVIDER_ORDER = ["anthropic", "claude-cli", "openai", "gateway"] as const;

const PROVIDERS: Record<
  string,
  { configured: () => boolean; create: (model?: string) => TextModel; label: string }
> = {
  anthropic: {
    configured: anthropicConfigured,
    create: (model) => anthropicModel(model || DEFAULT_ANTHROPIC_MODEL),
    label: "Anthropic",
  },
  "claude-cli": {
    configured: claudeCliConfigured,
    create: (model) => claudeCliModel(model),
    label: "Claude CLI",
  },
  openai: {
    configured: openaiConfigured,
    create: (model) =>
      openaiCompatibleModel("openai", model || DEFAULT_OPENAI_MODEL),
    label: "OpenAI",
  },
  gateway: {
    configured: gatewayConfigured,
    create: (model) =>
      openaiCompatibleModel("gateway", model || DEFAULT_OPENAI_MODEL),
    label: "AI Gateway",
  },
};

export type ModelOption = {
  ref: string;
  provider: string;
  label: string;
  model: string;
};

function defaultModelForProvider(provider: string): string {
  if (provider === "anthropic") return DEFAULT_ANTHROPIC_MODEL;
  if (provider === "openai" || provider === "gateway") return DEFAULT_OPENAI_MODEL;
  return "default";
}

function fromRef(ref: string): TextModel | null {
  const [provider, ...rest] = ref.trim().split(":");
  const entry = PROVIDERS[provider?.toLowerCase() ?? ""];
  if (!entry || !entry.configured()) return null;
  return entry.create(rest.join(":") || undefined);
}

/** True when this exact ref's provider key is configured (no failover). */
export function isModelRefConfigured(ref: string): boolean {
  return fromRef(ref) !== null;
}

function parseRefList(raw: string | undefined | null): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[,;\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Configured providers the UI can switch between. */
export function listConfiguredModelOptions(): ModelOption[] {
  const options: ModelOption[] = [];
  for (const key of PROVIDER_ORDER) {
    const entry = PROVIDERS[key];
    if (!entry.configured()) continue;
    const model = defaultModelForProvider(key);
    options.push({
      ref: key === "claude-cli" ? "claude-cli" : `${key}:${model}`,
      provider: key,
      label: entry.label,
      model,
    });
  }
  return options;
}

/**
 * Build the ordered model chain: primary + explicit fallbacks + other
 * configured providers (deduped by provider key).
 */
export function resolveModelChain(ref?: string | null): TextModel[] {
  const preferred = [
    ref,
    readModelPreferenceSync()?.modelRef,
    process.env.CONSOL_MODEL,
  ];

  let primary: TextModel | null = null;
  for (const candidate of preferred) {
    if (!candidate?.trim()) continue;
    const model = fromRef(candidate);
    if (model) {
      primary = model;
      break;
    }
  }
  if (!primary) {
    for (const key of PROVIDER_ORDER) {
      if (PROVIDERS[key].configured()) {
        primary = PROVIDERS[key].create();
        break;
      }
    }
  }
  if (!primary) return [];

  const chain: TextModel[] = [primary];
  const seenProviders = new Set([primary.ref.split(":")[0]!.toLowerCase()]);

  const pushIfNew = (candidate: TextModel | null) => {
    if (!candidate) return;
    const provider = candidate.ref.split(":")[0]!.toLowerCase();
    if (seenProviders.has(provider)) return;
    seenProviders.add(provider);
    chain.push(candidate);
  };

  for (const fallbackRef of parseRefList(process.env.CONSOL_MODEL_FALLBACKS)) {
    pushIfNew(fromRef(fallbackRef));
  }

  // Auto-failover across any other configured providers.
  for (const key of PROVIDER_ORDER) {
    if (!PROVIDERS[key].configured()) continue;
    if (seenProviders.has(key)) continue;
    pushIfNew(PROVIDERS[key].create());
  }

  return chain;
}

/** Resolve a model (with failover), or null when no provider key is set. */
export function getTextModel(ref?: string | null): TextModel | null {
  const chain = resolveModelChain(ref);
  if (chain.length === 0) return null;
  return withFailover(chain);
}

/** Active primary ref after preference / env resolution (no failover wrapper). */
export function getActiveModelRef(ref?: string | null): string | null {
  return resolveModelChain(ref)[0]?.ref ?? null;
}

/** Full failover chain refs for status UI. */
export function getModelFailoverRefs(ref?: string | null): string[] {
  return resolveModelChain(ref).map((m) => m.ref);
}

export function hasTextModel(): boolean {
  return getTextModel() !== null;
}

export const MOCK_MODEL_HINT =
  "_Sample reply — log in to the claude CLI, or set ANTHROPIC_API_KEY (or OPENAI_API_KEY / AI_GATEWAY_API_KEY) in .env.local, for live model responses. When Claude hits a rate limit, Consol fails over to other configured providers automatically._";
