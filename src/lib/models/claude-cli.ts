import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import type { ChatTurn, ModelEffort, TextModel } from "@/lib/models/types";

/**
 * Claude via the local Claude Code CLI (`claude -p`), using whatever login the
 * CLI already has — no API key needed. Tools are disabled, so this is a plain
 * text model.
 */

export function claudeCliPath(): string | null {
  const explicit = process.env.CONSOL_CLAUDE_BIN?.trim();
  if (explicit) return existsSync(explicit) ? explicit : null;
  for (const dir of (process.env.PATH ?? "").split(path.delimiter)) {
    if (!dir) continue;
    const candidate = path.join(dir, "claude");
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export function claudeCliConfigured(): boolean {
  return claudeCliPath() !== null;
}

function renderTranscript(messages: ChatTurn[]): string {
  if (messages.length === 1) return messages[0].content;
  return messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n");
}

type StreamLine = {
  type?: string;
  subtype?: string;
  is_error?: boolean;
  result?: string;
  event?: { type?: string; delta?: { type?: string; text?: string } };
};

async function* runClaude(input: {
  model?: string;
  system: string;
  prompt: string;
  effort: ModelEffort;
  signal?: AbortSignal;
}): AsyncGenerator<string> {
  const bin = claudeCliPath();
  if (!bin) throw new Error("claude CLI not found on PATH");

  const args = [
    "-p",
    "--tools",
    "",
    "--system-prompt",
    input.system,
    "--output-format",
    "stream-json",
    "--verbose",
    "--include-partial-messages",
    "--no-session-persistence",
    // Don't pick up project/user settings or CLAUDE.md from wherever we run.
    "--setting-sources",
    "",
    "--effort",
    input.effort,
  ];
  if (input.model) args.push("--model", input.model);

  const child = spawn(bin, args, {
    cwd: tmpdir(),
    stdio: ["pipe", "pipe", "pipe"],
    env: process.env,
    signal: input.signal,
  });
  child.stdin.end(input.prompt);

  let stderr = "";
  child.stderr.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
  });
  const exited = new Promise<number | null>((resolve) =>
    child.on("close", (code) => resolve(code)),
  );

  let streamed = false;
  let errorResult: string | null = null;
  for await (const line of createInterface({ input: child.stdout })) {
    if (!line.trim()) continue;
    let event: StreamLine;
    try {
      event = JSON.parse(line) as StreamLine;
    } catch {
      continue;
    }
    if (
      event.type === "stream_event" &&
      event.event?.type === "content_block_delta" &&
      event.event.delta?.type === "text_delta" &&
      event.event.delta.text
    ) {
      streamed = true;
      yield event.event.delta.text;
    } else if (event.type === "result") {
      if (event.is_error) errorResult = event.result || event.subtype || "error";
      else if (!streamed && event.result) yield event.result;
    }
  }

  const code = await exited;
  if (errorResult) throw new Error(`claude CLI: ${errorResult}`);
  if (code !== 0 && !streamed) {
    throw new Error(
      `claude CLI exited with ${code}: ${stderr.trim().slice(0, 300)}`,
    );
  }
}

export function claudeCliModel(model?: string): TextModel {
  return {
    ref: `claude-cli:${model ?? "default"}`,
    async generate({ system, prompt, effort = "high", abortSignal }) {
      let text = "";
      for await (const chunk of runClaude({
        model,
        system,
        prompt,
        effort,
        signal: abortSignal,
      })) {
        text += chunk;
      }
      return text.trim();
    },
    stream({ system, messages, effort = "low" }) {
      return runClaude({
        model,
        system,
        prompt: renderTranscript(messages),
        effort,
      });
    },
  };
}
