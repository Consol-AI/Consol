import { isRetryableProviderError } from "@/lib/models/errors";
import type { TextModel } from "@/lib/models/types";

/**
 * Try each model in order. On rate-limit / capacity errors, move to the next.
 * Streaming only fails over when nothing has been yielded yet (avoids
 * concatenating partial answers from two providers).
 */
export function withFailover(models: TextModel[]): TextModel {
  if (models.length === 0) {
    throw new Error("withFailover requires at least one model");
  }
  if (models.length === 1) return models[0]!;

  const primary = models[0]!;
  const chainLabel = models.map((m) => m.ref).join(" → ");

  return {
    ref: primary.ref,
    async generate(input) {
      let lastError: unknown;
      for (let i = 0; i < models.length; i++) {
        const model = models[i]!;
        try {
          return await model.generate(input);
        } catch (error) {
          lastError = error;
          const canRetry =
            isRetryableProviderError(error) && i < models.length - 1;
          if (!canRetry) throw error;
        }
      }
      throw lastError instanceof Error
        ? lastError
        : new Error(`All models failed (${chainLabel})`);
    },
    async *stream(input) {
      let lastError: unknown;
      for (let i = 0; i < models.length; i++) {
        const model = models[i]!;
        let yielded = false;
        try {
          for await (const chunk of model.stream(input)) {
            yielded = true;
            yield chunk;
          }
          return;
        } catch (error) {
          lastError = error;
          // Mid-stream failures already emitted tokens — don't splice another model in.
          const canRetry =
            !yielded &&
            isRetryableProviderError(error) &&
            i < models.length - 1;
          if (!canRetry) throw error;
          const next = models[i + 1]!;
          yield `\n\n_Switched to \`${next.ref}\` after \`${model.ref}\` hit a limit._\n\n`;
        }
      }
      throw lastError instanceof Error
        ? lastError
        : new Error(`All models failed (${chainLabel})`);
    },
  };
}
