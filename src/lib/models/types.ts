/** Provider-neutral text model used by Forge chat and agent stages. */

export type ModelEffort = "low" | "medium" | "high";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export interface TextModel {
  /** Model ref "<provider>:<model>", e.g. "anthropic:claude-opus-5-5". */
  ref: string;
  generate(input: {
    system: string;
    prompt: string;
    effort?: ModelEffort;
    /** Cancels the call (e.g. the flow was stopped). */
    abortSignal?: AbortSignal;
  }): Promise<string>;
  stream(input: {
    system: string;
    messages: ChatTurn[];
    effort?: ModelEffort;
  }): AsyncIterable<string>;
}
