# Consol

Consol is a **product factory** for cross-functional teams: shared product workspaces where product, engineering, design, and data lifecycles live side by side, with AI in the loop.

## What you can do

1. Open the factory and land in your org workspace (created automatically).
2. Create a **product**.
3. Attach process flow templates (PM, software delivery, design, data analysis) — typed stages (`agent` / `human` / `script`) with transitions.
4. Advance **work items** through the flow (run agents, approve human gates, run scripts).
5. Chat with **Forge AI** on a process or a specific item.

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

Without secrets, Consol uses:

- an in-memory **PGlite** database (schema from `migrations/`)
- a **simulated Cursor identity** (`cursor/identity.dev.ts`)
- **mock AI replies** when no model key is set

## Optional environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection (set automatically when published with Cursor Apps database) |
| `DATABASE_URL_UNPOOLED` | Direct Postgres URL for migrations |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway key for live model replies |
| `OPENAI_API_KEY` | Alternate live model key if Gateway is unset |

Do not commit secrets. Published apps get `DATABASE_URL` from Cursor when `cursor-app.json` declares a Postgres database.

## Stack

- Next.js App Router + TypeScript + Tailwind + shadcn/ui
- Cursor app identity for private/team viewers
- Postgres via `pg`, with PGlite locally
- Vercel AI SDK for chat
