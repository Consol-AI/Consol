-- Workspace-level OAuth connections (GitHub account first).
create table if not exists organization_connections (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  provider text not null,
  status text not null default 'connected',
  account_id text not null default '',
  account_login text not null default '',
  account_avatar_url text not null default '',
  scope text not null default '',
  access_token_enc text not null,
  token_type text not null default 'bearer',
  refresh_token_enc text not null default '',
  expires_at timestamptz,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, provider)
);

create index if not exists idx_organization_connections_org
  on organization_connections(organization_id);
