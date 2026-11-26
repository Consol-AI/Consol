import {
  addMessage,
  addStageRunEvent,
  getProcess,
  getProduct,
  getWorkItem,
  listStages,
  updateWorkItem,
} from "@/lib/factory";
import { advanceWorkItem } from "@/lib/flows/runtime";
import {
  updateAgentRun,
  type AgentRun,
} from "@/lib/integrations/agent-runs";
import {
  extractPrFromRun,
  getCursorRun,
  isSuccessfulRunStatus,
  isTerminalRunStatus,
} from "@/lib/integrations/cursor/client";
import { getCursorApiKey } from "@/lib/integrations/cursor/credentials";
import {
  addWorkItemExternalLink,
  listWorkItemExternalLinks,
} from "@/lib/integrations";

async function ensurePrLinked(input: {
  workItemId: string;
  title: string;
  body: string;
  prUrl: string;
  branch?: string;
  agentId?: string;
  actorSub: string;
  dryRun?: boolean;
}) {
  const links = await listWorkItemExternalLinks(input.workItemId);
  const prior = links.find(
    (l) => l.provider === "github" && l.link_type === "pull_request",
  );
  if (!prior) {
    const numberMatch = input.prUrl.match(/\/pull\/(\d+)/i);
    await addWorkItemExternalLink({
      workItemId: input.workItemId,
      provider: "github",
      linkType: "pull_request",
      externalId: numberMatch?.[1] ?? "",
      url: input.prUrl,
      title: input.title,
      metadata: {
        branch: input.branch ?? "",
        agentId: input.agentId ?? "",
        dryRun: Boolean(input.dryRun),
        source: "cursor-poll",
      },
      createdBy: input.actorSub,
    });
  }
  if (!input.body.includes(input.prUrl)) {
    const nextBody = [
      input.body.trim(),
      "",
      "---",
      "### Pull request",
      input.prUrl,
    ]
      .join("\n")
      .trim();
    await updateWorkItem({
      itemId: input.workItemId,
      title: input.title,
      body: nextBody,
    });
  }
}

export type PollAgentRunResult = {
  run: AgentRun;
  changed: boolean;
  advanced: boolean;
  summary: string;
};

export async function pollAgentRun(
  run: AgentRun,
  actorSub = "system",
): Promise<PollAgentRunResult> {
  const item = await getWorkItem(run.work_item_id);
  if (!item) {
    return {
      run,
      changed: false,
      advanced: false,
      summary: "Work item missing",
    };
  }
  const process = await getProcess(item.process_id);
  if (!process) {
    return {
      run,
      changed: false,
      advanced: false,
      summary: "Process missing",
    };
  }
  const product = process.product_id
    ? await getProduct(process.product_id)
    : null;
  const organizationId =
    product?.organization_id ?? process.organization_id ?? null;
  if (!organizationId) {
    return {
      run,
      changed: false,
      advanced: false,
      summary: "Organization missing",
    };
  }

  const apiKey = (await getCursorApiKey(organizationId)) ?? "";
  let remote;
  try {
    remote = await getCursorRun({
      apiKey,
      agentId: run.external_agent_id,
      runId: run.external_run_id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Cursor poll failed";
    return { run, changed: false, advanced: false, summary: message };
  }

  const { prUrl, branch } = extractPrFromRun(remote);
  const nextStatus = remote.status || run.status;
  const changed =
    nextStatus !== run.status ||
    Boolean(prUrl && prUrl !== run.pr_url) ||
    Boolean(branch && branch !== run.branch);

  let updated = run;
  if (changed) {
    updated = await updateAgentRun(run.id, {
      status: nextStatus,
      prUrl: prUrl ?? undefined,
      branch: branch ?? undefined,
      resultSummary: remote.text ?? run.result_summary,
      metadata: { lastPolledAt: new Date().toISOString() },
    });
  }

  if (!isTerminalRunStatus(nextStatus)) {
    return {
      run: updated,
      changed,
      advanced: false,
      summary: `Cursor run ${nextStatus}`,
    };
  }

  if (!isSuccessfulRunStatus(nextStatus)) {
    await addStageRunEvent({
      workItemId: item.id,
      processId: process.id,
      stageKey: "build",
      stageType: "script",
      outcome: "failure",
      summary: `Cursor build ${nextStatus}: ${remote.text || "no details"}`,
      createdBy: actorSub,
      metadata: {
        agentRunId: run.id,
        externalAgentId: run.external_agent_id,
      },
    });
    await addMessage({
      processId: process.id,
      workItemId: item.id,
      role: "system",
      content: `Cursor build ended with ${nextStatus}.`,
      authorName: "Cursor",
    });
    return {
      run: updated,
      changed: true,
      advanced: false,
      summary: `Cursor build ${nextStatus}`,
    };
  }

  if (prUrl) {
    await ensurePrLinked({
      workItemId: item.id,
      title: item.title,
      body: (await getWorkItem(item.id))!.body,
      prUrl,
      branch: branch ?? undefined,
      agentId: run.external_agent_id,
      actorSub,
    });
  }

  const stages = await listStages(process.id);
  const current = stages.find((s) => s.id === item.stage_id);
  const onBuild = current?.stage_key === "build";
  let advanced = false;
  let summary = prUrl
    ? `Cursor build finished with PR ${prUrl}`
    : "Cursor build finished";

  if (onBuild && prUrl) {
    const advance = await advanceWorkItem({
      itemId: item.id,
      outcome: "success",
      actorSub,
      execute: false,
    });
    advanced = Boolean(advance.toStageKey && advance.toStageKey !== "build");
    summary = advance.summary || summary;
    await addStageRunEvent({
      workItemId: item.id,
      processId: process.id,
      stageKey: "build",
      stageType: "script",
      outcome: "success",
      summary,
      createdBy: actorSub,
      metadata: {
        agentRunId: run.id,
        prUrl,
        autoAdvanced: advanced,
      },
    });

    // advanceWorkItem queues the next stage (validate) for the worker.
  } else if (onBuild && !prUrl) {
    await addStageRunEvent({
      workItemId: item.id,
      processId: process.id,
      stageKey: "build",
      stageType: "script",
      outcome: "failure",
      summary: "Cursor build finished without a pull request URL.",
      createdBy: actorSub,
      metadata: { agentRunId: run.id },
    });
    summary = "Cursor build finished without a pull request URL.";
  }

  return { run: updated, changed: true, advanced, summary };
}
