import { createOpenAI } from "@ai-sdk/openai";
import { generateText, streamText } from "ai";
import type { TextModel } from "@/lib/models/types";

export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

export function openaiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function gatewayConfigured(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY?.trim());
}

/** OpenAI directly, or any model through the Vercel AI Gateway. */
export function openaiCompatibleModel(
  provider: "openai" | "gateway",
  model = DEFAULT_OPENAI_MODEL,
): TextModel {
  const languageModel = () => {
    const openai =
      provider === "gateway"
        ? createOpenAI({
            apiKey: process.env.AI_GATEWAY_API_KEY?.trim(),
            baseURL: "https://ai-gateway.vercel.sh/v1",
          })
        : createOpenAI({ apiKey: process.env.OPENAI_API_KEY?.trim() });
    return openai(model);
  };
  return {
    ref: `${provider}:${model}`,
    async generate({ system, prompt, abortSignal }) {
      const result = await generateText({
        model: languageModel(),
        system,
        prompt,
        abortSignal,
      });
      return result.text.trim();
    },
    async *stream({ system, messages }) {
      const result = streamText({ model: languageModel(), system, messages });
      yield* result.textStream;
    },
  };
}
