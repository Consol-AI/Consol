# Consol

Consol is a **product factory** for cross-functional teams: shared product workspaces where product, engineering, design, and data lifecycles live side by side, with AI in the loop.

## What you can do

1. Open the factory and land in your org workspace (created automatically).
2. Create a **product**.
3. Attach process templates (PM, software delivery, design, data analysis).
4. Move **work items** across stages on a board.
5. Chat with **Forge AI** on a process or a specific item.
6. **Create teammate agents** (preset or blank) — each one is a Consol specialist and a deployable Agent SDK project under `agents/<slug>/`.

## Run locally

```bash
npm install
CONSOL_DEMO_AUTH=1 npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

Without secrets, Consol uses:

- an in-memory **PGlite** database (schema from `migrations/`)
- a **simulated Cursor identity** (`cursor/identity.dev.ts`) when `CONSOL_DEMO_AUTH=1`
- **mock AI replies** when no model key is set
- a **file registry** for agent teammates at `data/teammates.json`

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
| `DATABASE_URL` | Postgres connection (set automatically when published with Cursor Apps database) |
| `DATABASE_URL_UNPOOLED` | Direct Postgres URL for migrations |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway key for live model replies |
| `OPENAI_API_KEY` | Alternate live model key if Gateway is unset |

Do not commit secrets. Published apps get `DATABASE_URL` from Cursor when `cursor-app.json` declares a Postgres database.

## Stack

- Next.js App Router + TypeScript + Tailwind + shadcn/ui
- Cursor app identity for private/team viewers
- Postgres via `pg`, with PGlite locally
- Vercel AI SDK for Forge chat
- `@grok/agent-sdk` projects under `agents/` for teammate specialists
