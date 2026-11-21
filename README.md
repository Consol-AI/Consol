# Consol

Consol is a **product factory** for cross-functional teams: shared product workspaces where product, engineering, design, and data lifecycles live side by side, with AI in the loop.

## What you can do

1. Open the factory and land on **Home** — a Forge chat for coordinating tasks and decisions across the workspace.
2. Open **Projects** to create a **product** and link teammates.
3. Browse **Flows** to preview process templates (stages, owners, transitions) before attaching them.
4. Attach process flow templates (PM, software delivery, design, data analysis) — typed stages (`agent` / `human` / `script`) with transitions.
5. Connect **GitHub** on a product (owner/repo) so software delivery can open draft pull requests.
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
| `DATABASE_URL` | Postgres connection (Railway for testing, or Cursor Apps when published) |
| `DATABASE_URL_UNPOOLED` | Direct Postgres URL for migrations |
| `DATABASE_SSL` | Set `0` to accept Railway’s self-signed public proxy cert |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway key for live model replies |
| `OPENAI_API_KEY` | Alternate live model key if Gateway is unset |
| `GITHUB_TOKEN` | Personal access token for opening real draft PRs |
| `CONSOL_GITHUB_DRY_RUN` | Force dry-run PR opens (`1`) even when a token is set |

### GitHub

1. Open a product → **GitHub** → set owner, repo, and base branch.
2. Attach (or re-attach) the **Software delivery** flow — it includes an **Open PR** stage after Build.
3. On a work item at Open PR, choose **Open pull request**.
4. Without `GITHUB_TOKEN`, Consol records a dry-run PR link so the flow can be exercised locally.

Do not commit secrets. Published apps get `DATABASE_URL` from Cursor when `cursor-app.json` declares a Postgres database. For Railway testing, prefer `npm run db:railway-env`.

## Stack

- Next.js App Router + TypeScript + Tailwind + shadcn/ui
- Cursor app identity for private/team viewers
- Postgres via `pg`, with PGlite locally
- Vercel AI SDK for Forge chat
- `@grok/agent-sdk` projects under `agents/` for teammate specialists
