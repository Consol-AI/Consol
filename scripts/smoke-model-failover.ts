/**
 * Smoke: provider failover chain + retryable error detection.
 * Run: npm run smoke:model-failover
 */
import assert from "node:assert/strict";
import {
  getModelFailoverRefs,
  isRetryableProviderError,
  resolveModelChain,
} from "../src/lib/models";
import { withFailover } from "../src/lib/models/failover";
import type { TextModel } from "../src/lib/models/types";

function fakeModel(
  ref: string,
  behavior: "ok" | "rate-limit" | "hard-fail",
): TextModel {
  return {
    ref,
    async generate() {
      if (behavior === "rate-limit") {
        const err = new Error("rate_limit: hourly limit exceeded");
        (err as Error & { status: number }).status = 429;
        throw err;
      }
      if (behavior === "hard-fail") {
        throw new Error("invalid_api_key");
      }
      return `ok:${ref}`;
    },
    async *stream() {
      if (behavior === "rate-limit") {
        const err = new Error("429 Too Many Requests");
        (err as Error & { status: number }).status = 429;
        throw err;
      }
      if (behavior === "hard-fail") {
        throw new Error("invalid_api_key");
      }
      yield `ok:${ref}`;
    },
  };
}

async function main() {
  assert.equal(isRetryableProviderError({ status: 429 }), true);
  assert.equal(isRetryableProviderError({ status: 529 }), true);
  assert.equal(
    isRetryableProviderError(new Error("Claude hourly usage limit reached")),
    true,
  );
  assert.equal(isRetryableProviderError(new Error("invalid_api_key")), false);

  {
    const chain = withFailover([
      fakeModel("anthropic:claude", "rate-limit"),
      fakeModel("openai:gpt", "ok"),
    ]);
    const text = await chain.generate({
      system: "s",
      prompt: "p",
    });
    assert.equal(text, "ok:openai:gpt");
  }

  {
    const chain = withFailover([
      fakeModel("anthropic:claude", "rate-limit"),
      fakeModel("openai:gpt", "ok"),
    ]);
    let out = "";
    for await (const chunk of chain.stream({
      system: "s",
      messages: [{ role: "user", content: "hi" }],
    })) {
      out += chunk;
    }
    assert.match(out, /Switched to `openai:gpt`/);
    assert.match(out, /ok:openai:gpt/);
  }

  {
    const chain = withFailover([
      fakeModel("anthropic:claude", "hard-fail"),
      fakeModel("openai:gpt", "ok"),
    ]);
    await assert.rejects(
      () => chain.generate({ system: "s", prompt: "p" }),
      /invalid_api_key/,
    );
  }

  // Without keys, chain is empty (mock mode).
  const prev = {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
    CONSOL_MODEL: process.env.CONSOL_MODEL,
    CONSOL_MODEL_FALLBACKS: process.env.CONSOL_MODEL_FALLBACKS,
    PATH: process.env.PATH,
  };
  try {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.CONSOL_MODEL;
    delete process.env.CONSOL_MODEL_FALLBACKS;
    process.env.PATH = "/usr/bin:/bin";
    assert.deepEqual(resolveModelChain(), []);
    assert.deepEqual(getModelFailoverRefs(), []);
  } finally {
    for (const [key, value] of Object.entries(prev)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }

  console.log("smoke-model-failover: ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
