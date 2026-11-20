alter table messages
  add column if not exists organization_id text references organizations(id) on delete cascade;

create index if not exists idx_messages_org
  on messages(organization_id)
  where organization_id is not null and process_id is null and work_item_id is null;
