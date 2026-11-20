import { promises as fs } from "node:fs";
import path from "node:path";
import { BLANK_DEFAULTS, getPreset } from "./presets";
import type { CreateTeammateInput, TeammateModel } from "./types";

function modelLiteral(model: TeammateModel): string {
  if (!model.params?.length) {
    return JSON.stringify(model.id);
  }
  const params = model.params
    .map(
      (p) =>
        `      { id: ${JSON.stringify(p.id)}, value: ${JSON.stringify(p.value)} },`,
    )
    .join("\n");
  return `{
    id: ${JSON.stringify(model.id)},
    params: [
${params}
    ],
  }`;
}

function instructionsFor(input: CreateTeammateInput): string {
  const preset = input.presetId ? getPreset(input.presetId) : undefined;
  const base = preset?.instructions ?? BLANK_DEFAULTS.instructions;
  return `${base.trim()}

## Brief
${input.brief.trim()}

## Identity
- Name: ${input.name}
- Role: ${input.role}
- Slug: ${input.slug}
`;
}

function agentTs(input: CreateTeammateInput): string {
  const model: TeammateModel = {
    id: input.modelId,
    params: input.modelParams,
  };
  return `import { defineAgent } from "@grok/agent-sdk";

export default defineAgent({
  name: ${JSON.stringify(input.name)},
  description: ${JSON.stringify(`${input.role} teammate`)},
  model: ${modelLiteral(model)},
});
`;
}

function noteGoalTool(): string {
  return `import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";

export default defineTool({
  description: "Remember a durable goal or boundary for this teammate session.",
  effect: "idempotent",
  inputSchema: z.object({
    goal: z.string().describe("The lasting goal or rule to remember."),
  }),
  async execute({ goal }, ctx) {
    await ctx.host.kv.set("session_goal", goal);
    return { saved: true, goal };
  },
});
`;
}

function packageJson(slug: string, name: string): string {
  return `${JSON.stringify(
    {
      name: `consol-teammate-${slug}`,
      private: true,
      type: "module",
      description: `${name} — Consol teammate agent`,
      scripts: {
        check: "tsc --noEmit",
        dev: "agent-sdk serve --mode single --dev",
      },
      dependencies: {
        "@grok/agent-sdk": "0.7.0",
        zod: "^4.6.5",
      },
      devDependencies: {
        "@types/node": "^22.14.0",
        typescript: "^5.8.0",
      },
    },
    null,
    2,
  )}\n`;
}

function tsconfig(): string {
  return `${JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "bundler",
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        types: ["node"],
      },
      include: ["bot/**/*", "evals/**/*"],
    },
    null,
    2,
  )}\n`;
}

function smokeEval(name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return `import { defineEval, includes } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["smoke"],
  async test(t) {
    await t.send("What is your role on this team?");
    t.succeeded();
    t.check(t.reply, includes(/${escaped}|teammate|role/i));
  },
});
`;
}

function evalsConfig(): string {
  return `import { defineEvalConfig } from "@grok/agent-sdk/evals";

export default defineEvalConfig({
  maxConcurrency: 20,
});
`;
}

function readme(input: CreateTeammateInput): string {
  return `# ${input.name}

Consol teammate agent (\`${input.slug}\`).

## Run locally

From the Consol repo root:

\`\`\`bash
npm run agents:serve -- ${input.slug}
\`\`\`

Or from this directory after \`npm install\`:

\`\`\`bash
npx @grok/agent-sdk@0.7.0 serve --dir . --mode single --dev --port <registry-port>
\`\`\`

## Role

${input.role}

## Brief

${input.brief}
`;
}

/** Write a deployable Agent SDK project under agents/<slug>/. */
export async function scaffoldTeammateAgent(
  input: CreateTeammateInput,
): Promise<string> {
  const agentRoot = path.join(process.cwd(), "agents", input.slug);
  const botDir = path.join(agentRoot, "bot");
  const toolsDir = path.join(botDir, "tools");
  const evalsDir = path.join(agentRoot, "evals");

  await fs.mkdir(toolsDir, { recursive: true });
  await fs.mkdir(evalsDir, { recursive: true });

  await Promise.all([
    fs.writeFile(path.join(botDir, "agent.ts"), agentTs(input), "utf8"),
    fs.writeFile(
      path.join(botDir, "instructions.md"),
      instructionsFor(input),
      "utf8",
    ),
    fs.writeFile(path.join(toolsDir, "note_goal.ts"), noteGoalTool(), "utf8"),
    fs.writeFile(
      path.join(agentRoot, "package.json"),
      packageJson(input.slug, input.name),
      "utf8",
    ),
    fs.writeFile(path.join(agentRoot, "tsconfig.json"), tsconfig(), "utf8"),
    fs.writeFile(
      path.join(evalsDir, "evals.config.ts"),
      evalsConfig(),
      "utf8",
    ),
    fs.writeFile(
      path.join(evalsDir, "smoke.eval.ts"),
      smokeEval(input.name),
      "utf8",
    ),
    fs.writeFile(path.join(agentRoot, "README.md"), readme(input), "utf8"),
    fs.writeFile(
      path.join(agentRoot, ".gitignore"),
      "node_modules/\n.state/\n*.tsbuildinfo\n",
      "utf8",
    ),
  ]);

  return agentRoot;
}
