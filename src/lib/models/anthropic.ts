import Anthropic from "@anthropic-ai/sdk";
import type { ChatTurn, ModelEffort, TextModel } from "@/lib/models/types";

export const DEFAULT_ANTHROPIC_MODEL = "claude-opus-5-5";

let client: Anthropic | null = null;
function getClient(): Anthropic {
  // Reads ANTHROPIC_API_KEY from the environment.
  client ??= new Anthropic();
  return client;
}

export function anthropicConfigured(): boolean {
  return Boolean(
    process.env.ANTHROPIC_API_KEY?.trim() ||
      process.env.ANTHROPIC_AUTH_TOKEN?.trim(),
  );
}

function request(
  model: string,
  system: string,
  messages: ChatTurn[],
  effort: ModelEffort,
) {
  return getClient().beta.messages.stream({
    model,
    max_tokens: 16000,
    system,
    messages,
    thinking: { type: "adaptive" },
    output_config: { effort },
    // On a policy decline, the API re-runs the request on a fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });
}

const REFUSAL_TEXT =
  "_The model declined this request. Try rephrasing it, or pick another model with CONSOL_MODEL._";

export function anthropicModel(model = DEFAULT_ANTHROPIC_MODEL): TextModel {
  return {
    ref: `anthropic:${model}`,
    async generate({ system, prompt, effort = "high" }) {
      const message = await request(
        model,
        system,
        [{ role: "user", content: prompt }],
        effort,
      ).finalMessage();
      if (message.stop_reason === "refusal") return REFUSAL_TEXT;
      return message.content
        .flatMap((block) => (block.type === "text" ? [block.text] : []))
        .join("")
        .trim();
    },
    async *stream({ system, messages, effort = "low" }) {
      const stream = request(model, system, messages, effort);
      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          yield event.delta.text;
        }
      }
      const final = await stream.finalMessage();
      if (final.stop_reason === "refusal") yield `\n\n${REFUSAL_TEXT}`;
    },
  };
}
