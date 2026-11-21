export type CursorAgentStatus =
  | "CREATING"
  | "RUNNING"
  | "FINISHED"
  | "ERROR"
  | "CANCELLED"
  | "EXPIRED"
  | "ACTIVE"
  | "ARCHIVED"
  | string;

export type CursorRunStatus =
  | "CREATING"
  | "RUNNING"
  | "WAITING_FOR_BACKGROUND_WORK"
  | "FINISHED"
  | "ERROR"
  | "CANCELLED"
  | "EXPIRED"
  | string;

export type CursorAgent = {
  id: string;
  name?: string;
  status: CursorAgentStatus;
  url?: string;
  latestRunId?: string;
  autoCreatePR?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CursorRunGitBranch = {
  repoUrl?: string;
  branch?: string;
  prUrl?: string;
};

export type CursorRun = {
  id: string;
  agentId: string;
  status: CursorRunStatus;
  createdAt?: string;
  updatedAt?: string;
  text?: string;
  durationMs?: number;
  git?: {
    branches?: CursorRunGitBranch[];
  };
};

export type CreateCursorAgentInput = {
  apiKey: string;
  prompt: string;
  repoUrl: string;
  startingRef?: string;
  name?: string;
  autoCreatePR?: boolean;
  modelId?: string;
};

export type CreateCursorAgentResult = {
  agent: CursorAgent;
  run: CursorRun;
  dryRun: boolean;
};

function dryRunForced(): boolean {
  const flag = process.env.CONSOL_CURSOR_DRY_RUN?.trim();
  return flag === "1" || flag?.toLowerCase() === "true";
}

export function cursorEnvApiKey(): string | null {
  return process.env.CURSOR_API_KEY?.trim() || null;
}

export function cursorDryRunMode(apiKey?: string | null): boolean {
  return dryRunForced() || !apiKey?.trim();
}

async function cursorFetch<T>(
  path: string,
  init: RequestInit & { apiKey: string },
): Promise<T> {
  const { apiKey, ...rest } = init;
  const response = await fetch(`https://api.cursor.com${path}`, {
    ...rest,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(rest.headers ?? {}),
    },
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as { message?: string; error?: string };
      detail = body.message || body.error || detail;
    } catch {
      // ignore
    }
    throw new Error(`Cursor API ${response.status}: ${detail}`);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function fakeIds() {
  const suffix = crypto.randomUUID();
  return {
    agentId: `bc-dry-${suffix}`,
    runId: `run-dry-${suffix}`,
  };
}

/**
 * Launch a Cloud Agent against a repo. Without an API key (or with
 * CONSOL_CURSOR_DRY_RUN=1), returns a synthetic finished dry-run result.
 */
export async function createCursorAgent(
  input: CreateCursorAgentInput,
): Promise<CreateCursorAgentResult> {
  const apiKey = input.apiKey.trim();
  const repoUrl = input.repoUrl.trim();
  const prompt = input.prompt.trim();
  if (!repoUrl || !prompt) {
    throw new Error("Cursor agent requires repoUrl and prompt");
  }

  if (cursorDryRunMode(apiKey)) {
    const { agentId, runId } = fakeIds();
    const prNumber = Math.floor(Math.random() * 900) + 100;
    const ownerRepo = repoUrl
      .replace(/^https?:\/\/github\.com\//i, "")
      .replace(/\.git$/, "");
    return {
      dryRun: true,
      agent: {
        id: agentId,
        name: input.name || "Consol dry-run build",
        status: "ACTIVE",
        url: `https://cursor.com/agents/${agentId}`,
        latestRunId: runId,
        autoCreatePR: input.autoCreatePR !== false,
      },
      run: {
        id: runId,
        agentId,
        status: "FINISHED",
        text: "Dry-run Cursor build completed. Opened a simulated pull request.",
        git: {
          branches: [
            {
              repoUrl,
              branch: `cursor/consol-dry-${prNumber}`,
              prUrl: `https://github.com/${ownerRepo}/pull/${prNumber}`,
            },
          ],
        },
      },
    };
  }

  type CreateResponse = {
    agent: CursorAgent;
    run: CursorRun;
  };

  const body: Record<string, unknown> = {
    prompt: { text: prompt },
    repos: [
      {
        url: repoUrl,
        startingRef: input.startingRef?.trim() || "main",
      },
    ],
    autoCreatePR: input.autoCreatePR !== false,
  };
  if (input.name?.trim()) body.name = input.name.trim().slice(0, 100);
  if (input.modelId?.trim()) body.model = { id: input.modelId.trim() };

  const created = await cursorFetch<CreateResponse>("/v1/agents", {
    method: "POST",
    apiKey,
    body: JSON.stringify(body),
  });

  return {
    dryRun: false,
    agent: created.agent,
    run: created.run,
  };
}

export async function getCursorAgent(input: {
  apiKey: string;
  agentId: string;
}): Promise<CursorAgent> {
  if (cursorDryRunMode(input.apiKey) || input.agentId.startsWith("bc-dry-")) {
    return {
      id: input.agentId,
      status: "ACTIVE",
      url: `https://cursor.com/agents/${input.agentId}`,
      latestRunId: input.agentId.replace(/^bc-/, "run-"),
    };
  }
  return cursorFetch<CursorAgent>(`/v1/agents/${encodeURIComponent(input.agentId)}`, {
    method: "GET",
    apiKey: input.apiKey,
  });
}

export async function getCursorRun(input: {
  apiKey: string;
  agentId: string;
  runId: string;
}): Promise<CursorRun> {
  if (
    cursorDryRunMode(input.apiKey) ||
    input.agentId.startsWith("bc-dry-") ||
    input.runId.startsWith("run-dry-")
  ) {
    return {
      id: input.runId,
      agentId: input.agentId,
      status: "FINISHED",
      text: "Dry-run Cursor build completed.",
    };
  }
  return cursorFetch<CursorRun>(
    `/v1/agents/${encodeURIComponent(input.agentId)}/runs/${encodeURIComponent(input.runId)}`,
    { method: "GET", apiKey: input.apiKey },
  );
}

export function extractPrFromRun(run: CursorRun): {
  prUrl: string | null;
  branch: string | null;
} {
  const branches = run.git?.branches ?? [];
  for (const entry of branches) {
    if (entry.prUrl) {
      return { prUrl: entry.prUrl, branch: entry.branch ?? null };
    }
  }
  const withBranch = branches.find((b) => b.branch);
  return {
    prUrl: null,
    branch: withBranch?.branch ?? null,
  };
}

export function isTerminalRunStatus(status: string): boolean {
  const s = status.toUpperCase();
  return (
    s === "FINISHED" ||
    s === "ERROR" ||
    s === "CANCELLED" ||
    s === "EXPIRED"
  );
}

export function isSuccessfulRunStatus(status: string): boolean {
  return status.toUpperCase() === "FINISHED";
}
