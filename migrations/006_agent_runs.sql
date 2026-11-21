-- Cursor / external coding agent runs linked to work items.
create table if not exists agent_runs (
  id text primary key,
  work_item_id text not null references work_items(id) on delete cascade,
  process_id text not null references processes(id) on delete cascade,
  provider text not null default 'cursor',
  external_agent_id text not null default '',
  external_run_id text not null default '',
  status text not null default 'pending',
  prompt text not null default '',
  repo_url text not null default '',
  branch text not null default '',
  pr_url text not null default '',
  agent_url text not null default '',
  result_summary text not null default '',
  raw_metadata jsonb not null default '{}'::jsonb,
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_agent_runs_item
  on agent_runs(work_item_id, created_at desc);

create index if not exists idx_agent_runs_status
  on agent_runs(status, updated_at desc);

-- Optional structured metadata on stage run events.
alter table stage_run_events
  add column if not exists metadata jsonb not null default '{}'::jsonb;
