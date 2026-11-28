import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BUILD_AGENT_LABEL,
  FALLBACK_AGENT_LABEL,
  SPEC_AGENT_LABEL,
  VALIDATE_AGENT_LABEL,
  agentLabelForStage,
  mentionsVendor,
  scrubVendorNames,
  stageDescriptionForDisplay,
} from "@/lib/issues/agent-labels";

describe("agentLabelForStage", () => {
  it("labels the spec agent stage with its Consol agent name", () => {
    assert.equal(
      agentLabelForStage({
        stage_key: "spec",
        stage_type: "agent",
        config: { agentKey: "forge" },
      }),
      "Forge",
    );
  });

  it("falls back to the spec role label when the agent key is missing", () => {
    assert.equal(
      agentLabelForStage({ stage_key: "spec", stage_type: "agent", config: {} }),
      SPEC_AGENT_LABEL,
    );
  });

  it("labels build and validate by role, whatever the provider", () => {
    assert.equal(
      agentLabelForStage({
        stage_key: "build",
        stage_type: "script",
        config: { path: "coding-agent", agent: "cursor" },
      }),
      BUILD_AGENT_LABEL,
    );
    assert.equal(
      agentLabelForStage({
        stage_key: "implement",
        stage_type: "script",
        config: JSON.stringify({ path: "coding-agent", agent: "claude-code" }),
      }),
      BUILD_AGENT_LABEL,
    );
    assert.equal(
      agentLabelForStage({
        stage_key: "validate",
        stage_type: "script",
        config: { path: "validate-pr-checks" },
      }),
      VALIDATE_AGENT_LABEL,
    );
  });

  it("never returns a vendor name for unknown or vendor-like roles", () => {
    assert.equal(agentLabelForStage(null), FALLBACK_AGENT_LABEL);
    assert.equal(
      agentLabelForStage({ stage_key: "", stage_type: "script", config: {} }),
      FALLBACK_AGENT_LABEL,
    );
    assert.equal(
      agentLabelForStage({
        stage_key: "draft",
        stage_type: "agent",
        config: { agentKey: "claude" },
      }),
      FALLBACK_AGENT_LABEL,
    );
  });
});

describe("vendor scrubbing", () => {
  it("detects vendor names", () => {
    assert.ok(mentionsVendor("Cursor Cloud Agent"));
    assert.ok(mentionsVendor("ran Claude Code"));
    assert.ok(!mentionsVendor("Build agent started"));
  });

  it("rewrites legacy activity summaries", () => {
    assert.equal(
      scrubVendorNames("Cursor agent started (bc-1). Track progress at x."),
      "Build agent started (bc-1). Track progress at x.",
    );
    assert.equal(
      scrubVendorNames("Claude Code build finished and opened https://x/pull/1"),
      "Build finished and opened https://x/pull/1",
    );
    assert.equal(
      scrubVendorNames("Dry-run Cursor build finished"),
      "Dry-run build finished",
    );
    assert.equal(scrubVendorNames("Checks passed"), "Checks passed");
  });

  it("replaces a vendor-naming build description with Consol copy", () => {
    const description = stageDescriptionForDisplay({
      stage_key: "build",
      stage_type: "script",
      description:
        "A coding agent (Cursor Cloud Agent, or Claude Code locally) implements the change and opens a PR.",
    });
    assert.ok(!mentionsVendor(description));
    assert.match(description, /build agent/i);
    assert.equal(
      stageDescriptionForDisplay({
        stage_key: "build",
        stage_type: "script",
        description: "Custom copy.",
      }),
      "Custom copy.",
    );
  });
});
