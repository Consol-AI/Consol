import {
  anthropicConfigured,
  anthropicModel,
  DEFAULT_ANTHROPIC_MODEL,
} from "@/lib/models/anthropic";
import { claudeCliConfigured, claudeCliModel } from "@/lib/models/claude-cli";
import {
  DEFAULT_OPENAI_MODEL,
  gatewayConfigured,
  openaiCompatibleModel,
  openaiConfigured,
} from "@/lib/models/openai";
import type { TextModel } from "@/lib/models/types";

export type * from "@/lib/models/types";

/**
 * Models are interchangeable by ref "<provider>:<model>":
 *   anthropic:claude-opus-5-5 · claude-cli[:<model>] · openai:gpt-4o-mini · gateway:<model>
 * Per-stage `model` wins, then CONSOL_MODEL, then the first configured
 * provider: ANTHROPIC_API_KEY, the local `claude` CLI login, OpenAI, Gateway.
 */
const PROVIDERS: Record<
  string,
  { configured: () => boolean; create: (model?: string) => TextModel }
> = {
  anthropic: {
    configured: anthropicConfigured,
    create: (model) => anthropicModel(model || DEFAULT_ANTHROPIC_MODEL),
  },
  "claude-cli": {
    configured: claudeCliConfigured,
    create: (model) => claudeCliModel(model),
  },
  openai: {
    configured: openaiConfigured,
    create: (model) =>
      openaiCompatibleModel("openai", model || DEFAULT_OPENAI_MODEL),
  },
  gateway: {
    configured: gatewayConfigured,
    create: (model) =>
      openaiCompatibleModel("gateway", model || DEFAULT_OPENAI_MODEL),
  },
};

function fromRef(ref: string): TextModel | null {
  const [provider, ...rest] = ref.trim().split(":");
  const entry = PROVIDERS[provider?.toLowerCase() ?? ""];
  if (!entry || !entry.configured()) return null;
  return entry.create(rest.join(":") || undefined);
}

/** Resolve a model, or null when no provider key is set (callers mock). */
export function getTextModel(ref?: string | null): TextModel | null {
  for (const candidate of [ref, process.env.CONSOL_MODEL]) {
    if (candidate?.trim()) {
      const model = fromRef(candidate);
      if (model) return model;
    }
  }
  for (const key of ["anthropic", "claude-cli", "openai", "gateway"]) {
    if (PROVIDERS[key].configured()) return PROVIDERS[key].create();
  }
  return null;
}

export function hasTextModel(): boolean {
  return getTextModel() !== null;
}

export const MOCK_MODEL_HINT =
  "_Sample reply — log in to the claude CLI, or set ANTHROPIC_API_KEY (or OPENAI_API_KEY / AI_GATEWAY_API_KEY) in .env.local, for live model responses._";
