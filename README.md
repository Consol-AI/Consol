# Consol

Consol is a **product factory** for cross-functional teams: shared product workspaces where product, engineering, design, and data lifecycles live side by side, with AI in the loop.

## What you can do

1. Open the factory and land on **Home** — a Forge chat for coordinating tasks and decisions across the workspace.
2. Open **Work** to see running jobs (where you are needed) and **start a flow** with required input context — no product required.
3. Open **Projects** to create a **product** and link teammates.
4. Browse **Flows** to preview process templates (stages, owners, inputs, transitions) before starting or attaching them.
5. Attach process flow templates (PM, software delivery, design, data analysis) — typed stages (`agent` / `human` / `script`) with transitions.
6. Open **Connectors** to link external systems (GitHub first) to products.
7. Advance **work items** through the flow (run agents, open PRs, approve human gates, run scripts).
8. Chat with **Forge AI** on Home, a process, or a specific item.
9. **Create teammate agents** (preset or blank) — each one is a Consol specialist and a deployable Agent SDK project under `agents/<slug>/`.

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
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway key for live model replies |
| `OPENAI_API_KEY` | Alternate live model key if Gateway is unset |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client id |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `GITHUB_OAUTH_REDIRECT_URI` | Optional callback URL override |
| `CONNECTOR_TOKEN_SECRET` | Encrypts stored OAuth tokens (optional; falls back to client secret) |
| `CONSOL_GITHUB_DRY_RUN` | Force dry-run PR opens (`1`) even when OAuth is connected |
| `CURSOR_API_KEY` | Optional env fallback for Cursor Cloud Agents |
| `CONSOL_CURSOR_DRY_RUN` | Force dry-run Cursor builds (`1`) even when a key is set |

### GitHub

1. Create a GitHub OAuth App with callback  
   `http://127.0.0.1:43123/api/connectors/github/oauth/callback`  
   and set `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`.
2. Open **Connectors** → **GitHub** → **Connect with GitHub** (workspace OAuth — no product required).
3. Optionally link a default repository to a product on the same page.
4. Attach **Software delivery** and run **Open pull request** on a work item.
5. Without an OAuth connection, Consol records a dry-run PR link.

### Cursor Cloud Agents

1. Open **Connectors** → **Cursor** and paste a Cursor API key (Dashboard → API Keys), or set `CURSOR_API_KEY`.
2. Bind a product repo under **Connectors** → **GitHub** (demo default: `leaguesports/landing-page`).
3. From **Home** chat, ask Forge to ship a LeagueSports feature and confirm start.
4. Approve the spec — Consol launches a Cloud Agent, opens a PR, validates checks, then waits for ship approval before merging.
5. Without a Cursor key (or with `CONSOL_CURSOR_DRY_RUN=1`), builds run in dry-run mode.

Do not commit secrets. Published apps get `DATABASE_URL` from Cursor when `cursor-app.json` declares a Postgres database. For Railway testing, prefer `npm run db:railway-env`.

## Stack

- Next.js App Router + TypeScript + Tailwind + shadcn/ui
- Cursor app identity for private/team viewers
- Postgres via `pg`, with PGlite locally
- Vercel AI SDK for Forge chat
- `@grok/agent-sdk` projects under `agents/` for teammate specialists
