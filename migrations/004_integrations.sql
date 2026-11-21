-- Product-scoped external integrations (GitHub first).
create table if not exists product_integrations (
  id text primary key,
  product_id text not null references products(id) on delete cascade,
  provider text not null,
  status text not null default 'configured',
  config jsonb not null default '{}'::jsonb,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, provider)
);

create index if not exists idx_product_integrations_product
  on product_integrations(product_id);

-- External artifacts linked to work items (PRs, issues, deployments).
create table if not exists work_item_external_links (
  id text primary key,
  work_item_id text not null references work_items(id) on delete cascade,
  provider text not null,
  link_type text not null,
  external_id text not null default '',
  url text not null,
  title text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_by text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_work_item_external_links_item
  on work_item_external_links(work_item_id);
