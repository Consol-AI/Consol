-- Inferred flows: Forge chat proposes a work item, the user confirms it.
-- A proposal never starts anything by itself; confirm creates the work item.
-- state: proposed | starting | confirmed | dismissed | superseded
create table if not exists work_proposals (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  -- Assistant message the proposal block renders under.
  message_id text references messages(id) on delete set null,
  -- User message the proposal was inferred from.
  source_message_id text references messages(id) on delete set null,
  flow_key text not null,
  inputs jsonb not null default '{}'::jsonb,
  state text not null default 'proposed',
  error text,
  work_item_id text references work_items(id) on delete set null,
  created_by text not null,
  confirmed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_work_proposals_org
  on work_proposals(organization_id, created_at);

-- Where a work item came from, e.g. {"type":"chat","proposal_id":"wpr_…"}.
alter table work_items add column if not exists origin jsonb;
