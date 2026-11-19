create table if not exists organizations (
  id text primary key,
  name text not null,
  slug text not null unique,
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  user_sub text not null,
  display_name text not null default '',
  email text not null default '',
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (organization_id, user_sub)
);

create table if not exists products (
  id text primary key,
  organization_id text not null references organizations(id) on delete cascade,
  name text not null,
  description text not null default '',
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists processes (
  id text primary key,
  product_id text not null references products(id) on delete cascade,
  name text not null,
  domain text not null,
  template_key text not null default '',
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists stages (
  id text primary key,
  process_id text not null references processes(id) on delete cascade,
  name text not null,
  position integer not null,
  description text not null default ''
);

create table if not exists work_items (
  id text primary key,
  process_id text not null references processes(id) on delete cascade,
  stage_id text not null references stages(id) on delete restrict,
  title text not null,
  body text not null default '',
  status text not null default 'open',
  assignee_sub text,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists work_item_links (
  id text primary key,
  from_item_id text not null references work_items(id) on delete cascade,
  to_item_id text not null references work_items(id) on delete cascade,
  link_type text not null default 'related',
  unique (from_item_id, to_item_id, link_type)
);

create table if not exists messages (
  id text primary key,
  process_id text references processes(id) on delete cascade,
  work_item_id text references work_items(id) on delete cascade,
  role text not null,
  content text not null,
  author_sub text,
  author_name text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_memberships_user on memberships(user_sub);
create index if not exists idx_products_org on products(organization_id);
create index if not exists idx_processes_product on processes(product_id);
create index if not exists idx_stages_process on stages(process_id, position);
create index if not exists idx_work_items_process on work_items(process_id);
create index if not exists idx_messages_item on messages(work_item_id);
create index if not exists idx_messages_process on messages(process_id);
