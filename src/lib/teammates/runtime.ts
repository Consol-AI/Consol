import type { TeammateRecord } from "./types";
import { updateTeammateStatus } from "./registry";

export function teammateServeUrl(teammate: TeammateRecord): string {
  return `http://127.0.0.1:${teammate.port}`;
}

export async function probeTeammateRuntime(
  teammate: TeammateRecord,
): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 800);
  try {
    const res = await fetch(`${teammateServeUrl(teammate)}/v1/info`, {
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Refresh status based on whether local agent-sdk serve answers. */
export async function refreshTeammateRuntimeStatus(
  teammate: TeammateRecord,
): Promise<TeammateRecord> {
  const up = await probeTeammateRuntime(teammate);
  const next = up ? "local" : teammate.status === "local" ? "stopped" : "scaffolded";
  if (next === teammate.status) return teammate;
  return (await updateTeammateStatus(teammate.slug, next)) ?? {
    ...teammate,
    status: next,
  };
}

type SessionStart = {
  ok?: boolean;
  sessionId?: string;
  continuationToken?: string;
  error?: string;
  message?: string;
};

type StreamEvent = {
  type?: string;
  data?: {
    text?: string;
    content?: string;
    message?: { role?: string; content?: string };
  };
};

async function readAssistantFromStream(
  baseUrl: string,
  sessionId: string,
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);
  try {
    const res = await fetch(
      `${baseUrl}/v1/session/${sessionId}/stream?startIndex=0`,
      { signal: controller.signal, headers: { accept: "application/x-ndjson" } },
    );
    if (!res.ok || !res.body) return null;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let assistant = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        let event: StreamEvent;
        try {
          event = JSON.parse(trimmed) as StreamEvent;
        } catch {
          continue;
        }

        if (
          event.type === "message.appended" ||
          event.type === "message.completed"
        ) {
          const text =
            event.data?.text ??
            event.data?.content ??
            event.data?.message?.content;
          if (typeof text === "string" && text) {
            if (event.type === "message.appended") assistant += text;
            else assistant = text;
          }
        }

        if (event.type === "turn.completed" && assistant.trim()) {
          return assistant.trim();
        }
        if (event.type === "turn.failed") {
          return assistant.trim() || null;
        }
      }
    }

    return assistant.trim() || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function runTeammateTurn(input: {
  teammate: TeammateRecord;
  message: string;
  sessionId?: string | null;
  continuationToken?: string | null;
}): Promise<{
  source: "agent-sdk" | "mock";
  reply: string;
  sessionId?: string;
  continuationToken?: string;
}> {
  const up = await probeTeammateRuntime(input.teammate);
  if (!up) {
    return {
      source: "mock",
      reply: mockTeammateReply(input.teammate, input.message),
    };
  }

  const base = teammateServeUrl(input.teammate);

  try {
    if (input.sessionId && input.continuationToken) {
      const follow = await fetch(`${base}/v1/session/${input.sessionId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: input.message,
          continuationToken: input.continuationToken,
        }),
      });
      const body = (await follow.json()) as SessionStart;
      if (!follow.ok || !body.ok) {
        return {
          source: "mock",
          reply: mockTeammateReply(input.teammate, input.message),
        };
      }
      const reply = await readAssistantFromStream(base, input.sessionId);
      return {
        source: reply ? "agent-sdk" : "mock",
        reply: reply ?? mockTeammateReply(input.teammate, input.message),
        sessionId: input.sessionId,
        continuationToken: body.continuationToken,
      };
    }

    const start = await fetch(`${base}/v1/session`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: input.message, title: input.teammate.name }),
    });
    const body = (await start.json()) as SessionStart;
    if (!start.ok || !body.ok || !body.sessionId) {
      return {
        source: "mock",
        reply: mockTeammateReply(input.teammate, input.message),
      };
    }

    const reply = await readAssistantFromStream(base, body.sessionId);
    await updateTeammateStatus(input.teammate.slug, "local");
    return {
      source: reply ? "agent-sdk" : "mock",
      reply: reply ?? mockTeammateReply(input.teammate, input.message),
      sessionId: body.sessionId,
      continuationToken: body.continuationToken,
    };
  } catch {
    return {
      source: "mock",
      reply: mockTeammateReply(input.teammate, input.message),
    };
  }
}

export function mockTeammateReply(
  teammate: TeammateRecord,
  userMessage: string,
): string {
  return [
    `**${teammate.name}** (${teammate.role}) — scaffolded agent reply`,
    "",
    `I read your note: “${userMessage.trim()}”`,
    "",
    "Based on my brief:",
    teammate.brief.trim() || "_No brief set yet._",
    "",
    "Suggested next step:",
    "1. Confirm the outcome and constraints for this request.",
    "2. I’ll draft a concrete plan against my role tools and model.",
    "3. Ask me to remember any lasting rule with a clear finish line.",
    "",
    `_Mock reply — start local runtime with \`npm run agents:serve -- ${teammate.slug}\` (port ${teammate.port}) for live Agent SDK turns._`,
  ].join("\n");
}
