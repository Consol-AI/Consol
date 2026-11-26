import {
  addMessage,
  addStageRunEvent,
  getProcess,
  getWorkItem,
  listStages,
  updateWorkItem,
} from "@/lib/factory";
import { isStoppedStatus } from "@/lib/flows/errors";
import { advanceWorkItem } from "@/lib/flows/runtime";
import {
  updateAgentRun,
  type AgentRun,
} from "@/lib/integrations/agent-runs";
import { getCodingAgent } from "@/lib/coding-agents";
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
        source: "coding-agent-poll",
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
  if (isStoppedStatus(item.status)) {
    return { run, changed: false, advanced: false, summary: "Flow stopped" };
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
  const organizationId = process.organization_id ?? null;
  if (!organizationId) {
    return {
      run,
      changed: false,
      advanced: false,
      summary: "Organization missing",
    };
  }

  const agent = getCodingAgent(run.provider);
  if (!agent) {
    return {
      run,
      changed: false,
      advanced: false,
      summary: `Unknown coding agent provider: ${run.provider}`,
    };
  }
  const label = agent.name;

  let remote;
  try {
    remote = await agent.poll({
      organizationId,
      externalAgentId: run.external_agent_id,
      externalRunId: run.external_run_id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : `${label} poll failed`;
    return { run, changed: false, advanced: false, summary: message };
  }

  // The flow may have been stopped while we waited on the agent: the stop
  // marked this run CANCELLED, so don't overwrite it or advance the item.
  const latest = await getWorkItem(item.id);
  if (!latest || isStoppedStatus(latest.status)) {
    return { run, changed: false, advanced: false, summary: "Flow stopped" };
  }

  const { prUrl, branch } = remote;
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

  if (!agent.isTerminal(nextStatus)) {
    return {
      run: updated,
      changed,
      advanced: false,
      summary: `${label} run ${nextStatus}`,
    };
  }

  if (!agent.isSuccessful(nextStatus)) {
    await addStageRunEvent({
      workItemId: item.id,
      processId: process.id,
      stageKey: "build",
      stageType: "script",
      outcome: "failure",
      summary: `${label} build ${nextStatus}: ${remote.text || "no details"}`,
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
      content: `${label} build ended with ${nextStatus}.`,
      authorName: label,
    });
    return {
      run: updated,
      changed: true,
      advanced: false,
      summary: `${label} build ${nextStatus}`,
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
    ? `${label} build finished with PR ${prUrl}`
    : `${label} build finished`;

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
      summary: `${label} build finished without a pull request URL.`,
      createdBy: actorSub,
      metadata: { agentRunId: run.id },
    });
    summary = `${label} build finished without a pull request URL.`;
  }

  return { run: updated, changed: true, advanced, summary };
}
