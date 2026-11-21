-- Workspace-level Work: org-scoped processes + structured work item inputs.

alter table processes
  add column if not exists organization_id text references organizations(id) on delete cascade;

update processes p
set organization_id = pr.organization_id
from products pr
where p.product_id = pr.id
  and (p.organization_id is null or p.organization_id = '');

alter table processes
  alter column product_id drop not null;

create index if not exists idx_processes_org
  on processes(organization_id);

create unique index if not exists idx_processes_org_template_workspace
  on processes(organization_id, template_key)
  where product_id is null and template_key <> '';

alter table work_items
  add column if not exists inputs jsonb not null default '{}'::jsonb;
