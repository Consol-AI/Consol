import {
  createCursorAgent,
  extractPrFromRun,
  getCursorRun,
  isSuccessfulRunStatus,
  isTerminalRunStatus,
} from "@/lib/integrations/cursor/client";
import { getCursorApiKey } from "@/lib/integrations/cursor/credentials";
import type { CodingAgentProvider } from "@/lib/coding-agents/types";

/** Cursor Cloud Agents. Key from CURSOR_API_KEY (or the Connectors page). */
export const cursorCodingAgent: CodingAgentProvider = {
  key: "cursor",
  name: "Cursor",
  async launch({ organizationId, prompt, title, repo }) {
    const apiKey = (await getCursorApiKey(organizationId)) ?? "";
    const created = await createCursorAgent({
      apiKey,
      prompt,
      repoUrl: `https://github.com/${repo.owner}/${repo.repo}`,
      startingRef: repo.baseBranch,
      name: title.slice(0, 100),
      autoCreatePR: true,
    });
    const { prUrl, branch } = extractPrFromRun(created.run);
    return {
      externalAgentId: created.agent.id,
      externalRunId: created.run.id,
      agentUrl:
        created.agent.url ?? `https://cursor.com/agents/${created.agent.id}`,
      status: created.dryRun ? "FINISHED" : created.run.status || "CREATING",
      prUrl,
      branch,
      text: created.run.text ?? null,
      dryRun: created.dryRun,
    };
  },
  async poll({ organizationId, externalAgentId, externalRunId }) {
    const apiKey = (await getCursorApiKey(organizationId)) ?? "";
    const run = await getCursorRun({
      apiKey,
      agentId: externalAgentId,
      runId: externalRunId,
    });
    const { prUrl, branch } = extractPrFromRun(run);
    return { status: run.status, prUrl, branch, text: run.text ?? null };
  },
  isTerminal: isTerminalRunStatus,
  isSuccessful: isSuccessfulRunStatus,
};
