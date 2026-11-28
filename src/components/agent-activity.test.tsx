import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ActivityList, WorkingNowPanel } from "@/components/agent-activity";
import type { Stage, StageRunEvent } from "@/lib/factory";
import type { AgentRun } from "@/lib/integrations/agent-runs-shared";
import type { WorkItemJobState } from "@/lib/jobs/queue";

const VENDOR = /claude|cursor/i;

function stage(overrides: Partial<Stage>): Stage {
  return {
    id: `stage_${overrides.stage_key}`,
    process_id: "proc_1",
    name: "Stage",
    position: 0,
    description: "",
    stage_key: "stage",
    stage_type: "script",
    config: {},
    ...overrides,
  };
}

function agentRun(overrides: Partial<AgentRun>): AgentRun {
  return {
    id: "run_1",
    work_item_id: "item_1",
    process_id: "proc_1",
    provider: "cursor",
    external_agent_id: "bc-123",
    external_run_id: "",
    status: "RUNNING",
    prompt: "",
    repo_url: "https://github.com/acme/app",
    branch: "consol/fix-thing",
    pr_url: "",
    agent_url: "https://example.test/agents/bc-123",
    result_summary: "",
    raw_metadata: {},
    created_by: "system",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function event(overrides: Partial<StageRunEvent>): StageRunEvent {
  return {
    id: `evt_${Math.random()}`,
    work_item_id: "item_1",
    process_id: "proc_1",
    stage_key: "build",
    stage_type: "script",
    outcome: "pending",
    summary: "",
    created_by: "system",
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

const runningJob: WorkItemJobState = {
  active: {
    kind: "stage.execute",
    status: "running",
    stageId: null,
    since: new Date().toISOString(),
  },
  failed: null,
};
const idleJob: WorkItemJobState = { active: null, failed: null };

/** Visible text of the rendered markup (tags and attributes stripped). */
function text(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

const buildStage = stage({
  stage_key: "build",
  name: "Build",
  stage_type: "script",
  // The description stored by older software-delivery processes.
  description:
    "A coding agent (Cursor Cloud Agent, or Claude Code locally) implements the change and opens a PR.",
  config: { path: "coding-agent", agent: "auto" },
});

describe("work item agent status", () => {
  it("build: one entry labelled Build agent, no vendor names", () => {
    const html = renderToStaticMarkup(
      <WorkingNowPanel
        current={buildStage}
        jobState={idleJob}
        latestAgentRun={agentRun({
          provider: "claude-code",
          result_summary: "Cursor agent started (bc-123).",
        })}
        agentRunActive
      />,
    );
    const visible = text(html);
    assert.equal(count(html, 'data-testid="agent-status"'), 1);
    assert.match(visible, /Build agent is building the change/);
    assert.match(visible, /Build agent · running/);
    assert.doesNotMatch(visible, VENDOR);
  });

  it("build with multiple underlying runs/sources still shows a single agent", () => {
    // A worker job and an external coding-agent run are both active for the
    // one logical build, and the activity has events from each provider.
    const html = renderToStaticMarkup(
      <>
        <WorkingNowPanel
          current={buildStage}
          jobState={runningJob}
          latestAgentRun={agentRun({ provider: "cursor" })}
          agentRunActive
        />
        <ActivityList
          runEvents={[
            event({ summary: "Claude Code build failed: timeout", outcome: "failure" }),
            event({ summary: "Cursor agent started (bc-123). Track progress at x." }),
          ]}
        />
      </>,
    );
    const visible = text(html);
    assert.equal(count(html, 'data-testid="agent-status"'), 1);
    assert.equal(count(visible, "Build agent is building"), 1);
    assert.equal(count(visible, "Build agent ·"), 1);
    assert.doesNotMatch(visible, VENDOR);
  });

  it("spec: one entry labelled with the Consol spec agent", () => {
    const html = renderToStaticMarkup(
      <WorkingNowPanel
        current={stage({
          stage_key: "spec",
          name: "Spec",
          stage_type: "agent",
          description: "Technical approach and acceptance criteria.",
          config: { agentKey: "forge" },
        })}
        jobState={runningJob}
        latestAgentRun={null}
        agentRunActive={false}
      />,
    );
    const visible = text(html);
    assert.equal(count(html, 'data-testid="agent-status"'), 1);
    assert.match(visible, /Forge is drafting the spec/);
    assert.doesNotMatch(visible, VENDOR);
  });

  it("validate: one entry labelled Validate agent", () => {
    const html = renderToStaticMarkup(
      <WorkingNowPanel
        current={stage({
          stage_key: "validate",
          name: "Validate",
          stage_type: "script",
          description: "GitHub Checks on the pull request head.",
          config: { path: "validate-pr-checks" },
        })}
        jobState={runningJob}
        latestAgentRun={null}
        agentRunActive={false}
      />,
    );
    const visible = text(html);
    assert.equal(count(html, 'data-testid="agent-status"'), 1);
    assert.match(visible, /Validate agent is waiting on CI checks/);
    assert.doesNotMatch(visible, VENDOR);
  });

  it("unknown agent role falls back to the generic label", () => {
    const html = renderToStaticMarkup(
      <WorkingNowPanel
        current={stage({
          stage_key: "draft",
          name: "Draft",
          stage_type: "agent",
          config: { agentKey: "cursor" },
        })}
        jobState={runningJob}
        latestAgentRun={null}
        agentRunActive={false}
      />,
    );
    const visible = text(html);
    assert.match(visible, /Agent is drafting the draft/);
    assert.doesNotMatch(visible, VENDOR);
  });
});
