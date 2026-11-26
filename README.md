# Consol

Consol is a **product factory** for cross-functional teams: one shared workspace where product, engineering, design, and data lifecycles live side by side, with AI in the loop.

## What you can do

1. Open the factory and land on **Home** — a Forge chat for coordinating tasks and decisions across the workspace. Ask it to do something ("implement X") and it proposes a flow you can confirm and start right from the chat.
2. Open **Work** to see running jobs (where you are needed) and **start a flow** with required input context.
3. Browse **Flows** to preview process templates (stages, owners, inputs, transitions) before starting or attaching them.
4. Start process flow templates (PM, software delivery, design, data analysis) — typed stages (`agent` / `human` / `script`) with transitions.
5. Open **Connectors** to see how GitHub and Cursor are wired up.
6. Advance **work items** through the flow (run agents, open PRs, approve human gates, run scripts).
7. Chat with **Forge AI** on Home, a process, or a specific item.
8. **Create teammate agents** (preset or blank) — each one is a Consol specialist and a deployable Agent SDK project under `agents/<slug>/`.

## Run locally

```bash
npm install
CONSOL_DEMO_AUTH=1 npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

Without secrets, Consol uses:

- a local **PGlite** database under `.data/` (schema from `migrations/`)
- a **simulated Cursor identity** (`cursor/identity.dev.ts`) when `CONSOL_DEMO_AUTH=1`
- **mock AI replies** when no model key is set
- a **file registry** for agent teammates at `data/teammates.json`

### Background worker

Agent stages, script stages and external agent polling (Cursor) run as **jobs** in Postgres (`jobs` table), not inside web requests. A worker claims them with `FOR UPDATE SKIP LOCKED`, so you can run as many workers as you like.

- **Local dev with PGlite** (no `DATABASE_URL`): the worker starts inline inside `next dev` via `src/instrumentation.ts`. Nothing extra to run.
- **With Postgres**: run the web app and the worker as separate processes:

```bash
CONSOL_WORKER=off npm run dev   # web only
npm run worker                  # separate terminal
```

`CONSOL_WORKER=inline` forces the worker into the web process even with Postgres (handy for a single-container deploy). `npm run smoke:worker` checks the queue end to end.

### Self-host with Docker

One image runs every role (web, worker, migrate):

```bash
cp .env.example .env   # optional: GitHub / Cursor / model keys
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). Compose starts Postgres, applies migrations, then starts `web` and `worker`.

### Hosted on Railway

Create two services from this repo, both built from the `Dockerfile`, and point each at its config file (Service → Settings → Config-as-code):

| Service | Config file | Runs |
| --- | --- | --- |
| `web` | `deploy/railway/web.json` | `npm run start:web`, migrations as pre-deploy, health check at `/api/health` |
| `worker` | `deploy/railway/worker.json` | `npm run worker` (scale with replicas) |

Give both services the same variables: `DATABASE_URL` (reference the Railway Postgres), `CONNECTOR_TOKEN_SECRET`, model keys, GitHub/Cursor credentials. Set `CONSOL_WORKER=off` on `web`.

### Railway Postgres (testing)

A cheap Hobby Postgres lives in the Railway project **consol** (sleep enabled, 0.5 vCPU / 0.5 GB). Use it instead of PGlite when you want a shared durable DB:

```bash
# requires: railway CLI logged in + linked (or uses the consol project IDs in the script)
npm run db:railway-env
npm run db:migrate
CONSOL_DEMO_AUTH=1 npm run dev
```

That writes `.env.local` with the public TCP proxy URL (`*.rlwy.net`). Leave `DATABASE_URL` unset to fall back to PGlite.

## Teammates (agent specialists)

Teammates are hybrid: app-level specialists (persona, model, brief, tools) and real Agent SDK agents you can serve or deploy later.

### Create

1. Open **Teammates** in the sidebar, or `/app/teammates`.
2. Choose **Create teammate**.
3. Pick a **preset** (Engineer, Designer, Data analyst) or **Blank teammate** — equal entry points.
4. Set identity (name + slug), refine role/brief/model, confirm.
5. Consol scaffolds `agents/<slug>/` and registers the teammate, then opens chat.

### Local agent runtime

Chat works with an instruction-aware mock when the agent is not serving. For live Agent SDK turns:

```bash
npm run agents:serve -- <slug>
```

That runs `npx @grok/agent-sdk@0.7.0 serve` against `agents/<slug>/` on the port stored in `data/teammates.json` (starting at `44001`).

Production deploy UX for agents is intentionally out of scope for this slice.

## Optional environment

| Variable | Purpose |
| --- | --- |
| `CONSOL_DEMO_AUTH` | Enable local demo viewer (`1`) |
| `CONSOL_WORKER` | `inline` runs jobs inside the web process, `off` leaves them to `npm run worker` (default: inline only without `DATABASE_URL`) |
| `WORKER_CONCURRENCY` | Jobs one worker process runs at once (default `4`) |
| `DATABASE_URL` | Postgres connection (Railway for testing, or Cursor Apps when published) |
| `DATABASE_URL_UNPOOLED` | Direct Postgres URL for migrations |
| `DATABASE_SSL` | Set `0` to accept Railway’s self-signed public proxy cert |
| `ANTHROPIC_API_KEY` | Claude API key for Forge chat and agent stages (optional: the local `claude` CLI login is used otherwise) |
| `CONSOL_MODEL` | Default model ref `<provider>:<model>` (e.g. `anthropic:claude-opus-5-5`, `claude-cli`, `openai:gpt-4o-mini`, `gateway:<model>`). Default: workspace preference, then `ANTHROPIC_API_KEY`, then the `claude` CLI, then OpenAI, then Gateway |
| `CONSOL_MODEL_FALLBACKS` | Comma-separated model refs tried after the primary on rate-limit / capacity errors (other configured providers are also tried automatically) |
| `CONSOL_CODING_AGENT` | Build-stage coding agent: `cursor` (Cloud Agents) or `claude-code` (local `claude` CLI). Default: Cursor if `CURSOR_API_KEY` is set, else Claude Code if the CLI is installed |
| `CONSOL_CODING_AGENT_MODEL` | Optional `--model` for local Claude Code runs |
| `CONSOL_AGENT_ALLOWED_TOOLS` | Comma-separated tool allowlist for local Claude Code runs (default: file edits plus git status/diff/log, npm ci/install/lint/test, npx tsc) |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway key (`gateway:` models) |
| `OPENAI_API_KEY` | OpenAI key (`openai:` models) |
| `CONSOL_GITHUB_REPO` | Default `owner/repo` for software delivery (default: this checkout's `git remote get-url origin`) |
| `CONSOL_GITHUB_BASE_BRANCH` | Base branch for PRs (default: the remote's default branch) |
| `GITHUB_TOKEN` / `GH_TOKEN` | GitHub token for PRs/checks/merge (default: `gh auth token`) |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client id |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `GITHUB_OAUTH_REDIRECT_URI` | Optional callback URL override |
| `CONNECTOR_TOKEN_SECRET` | Encrypts stored OAuth tokens (optional; falls back to client secret) |
| `CONSOL_GITHUB_DRY_RUN` | Force dry-run PR opens (`1`) even when OAuth is connected |
| `CURSOR_API_KEY` | Cursor Cloud Agents key for the Build stage |
| `CONSOL_CURSOR_DRY_RUN` | Force dry-run Cursor builds (`1`) even when a key is set |

### Building Consol with Consol

No OAuth app or UI setup needed — everything comes from your local checkout and `.env.local`:

1. `gh auth login` (Consol uses `gh auth token` for PRs, checks, and merges), or set `GITHUB_TOKEN`.
2. Log in to the `claude` CLI. With no keys set, Forge chat and agent stages use it, and the Build stage runs **Claude Code locally**: a worktree of a Consol-managed clone under `.data/repos`, restricted to file edits plus a short shell allowlist. Consol then commits, pushes with your `gh` login, and opens the PR. Logs: `.data/agent-runs/<run>/agent.log`.
   To use Cursor Cloud Agents instead, set `CURSOR_API_KEY` (Cursor's GitHub app needs repo access). `ANTHROPIC_API_KEY` switches text generation to the API.
3. The default repo is this checkout's `origin` (override with `CONSOL_GITHUB_REPO`, or per work item via the **Repository** input).
4. From **Home** chat ask for the work, e.g. "implement a footer changelog link in consol". Forge replies with a **work proposal** block (flow, title, goal, repository, acceptance). Edit it and press **Start**, or dismiss it. Nothing runs until you press Start. You can also use **Work → Start flow → Software delivery**. Without a model configured, only "ship: …" / "implement …" style messages are recognised.
5. Approve the spec — the coding agent opens a PR, **Validate** waits on the repo's CI checks, then you approve ship and Consol merges.
6. Without a Cursor key / GitHub token (or with `CONSOL_CURSOR_DRY_RUN=1` / `CONSOL_GITHUB_DRY_RUN=1`), those steps run as dry-runs.

**Connectors → GitHub** shows which repo and credentials are in use. Workspace OAuth (`GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`) still works and takes priority when connected.

### Models and coding agents

- Text models are interchangeable via **Connectors → Models**, the chat model picker, `CONSOL_MODEL`, or a per-stage `model` in a flow definition (`src/lib/models/`).
- When Claude (or any primary) hits a rate limit or capacity error, Consol fails over to `CONSOL_MODEL_FALLBACKS` and then any other configured provider keys — so you can keep working instead of waiting out the hour.
- The Build stage's coding agent is picked by the stage's `agent` config (`auto` by default; see `CONSOL_CODING_AGENT`; providers in `src/lib/coding-agents/`).

Do not commit secrets. Published apps get `DATABASE_URL` from Cursor when `cursor-app.json` declares a Postgres database. For Railway testing, prefer `npm run db:railway-env`.

## Stack

- Next.js App Router + TypeScript + Tailwind + shadcn/ui
- Cursor app identity for private/team viewers
- Postgres via `pg`, with PGlite locally
- Anthropic SDK (Claude) by default, Vercel AI SDK for OpenAI / Gateway models
- `@grok/agent-sdk` projects under `agents/` for teammate specialists
