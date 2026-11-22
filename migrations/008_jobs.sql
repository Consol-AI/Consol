-- Durable background jobs, claimed by worker processes with SKIP LOCKED.
create table if not exists jobs (
  id text primary key,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  -- queued | running | succeeded | failed
  status text not null default 'queued',
  -- Optional: at most one queued/running job per key (e.g. one poll per run).
  dedupe_key text,
  -- Optional: lets the UI find in-flight work for an item.
  work_item_id text references work_items(id) on delete cascade,
  attempts integer not null default 0,
  max_attempts integer not null default 1,
  run_at timestamptz not null default now(),
  locked_by text,
  locked_until timestamptz,
  last_error text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_jobs_ready
  on jobs(run_at)
  where status in ('queued', 'running');

create unique index if not exists idx_jobs_dedupe_active
  on jobs(dedupe_key)
  where dedupe_key is not null and status in ('queued', 'running');

create index if not exists idx_jobs_work_item
  on jobs(work_item_id, updated_at desc);
