-- Typed flow stages + transition edges for process flow graphs.

alter table stages
  add column if not exists stage_key text not null default '';

alter table stages
  add column if not exists stage_type text not null default 'legacy';

alter table stages
  add column if not exists config jsonb not null default '{}'::jsonb;

create table if not exists stage_transitions (
  id text primary key,
  process_id text not null references processes(id) on delete cascade,
  from_stage_key text not null,
  to_stage_key text not null,
  when_label text not null default 'default'
);

create index if not exists idx_stage_transitions_process
  on stage_transitions(process_id, from_stage_key);

create table if not exists stage_run_events (
  id text primary key,
  work_item_id text not null references work_items(id) on delete cascade,
  process_id text not null references processes(id) on delete cascade,
  stage_key text not null,
  stage_type text not null,
  outcome text not null default '',
  summary text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_stage_run_events_item
  on stage_run_events(work_item_id, created_at);
