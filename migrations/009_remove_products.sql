-- Products are gone: work lives at the workspace level, and the GitHub repo
-- comes from the work item input, CONSOL_GITHUB_REPO, or the local git remote.

drop index if exists idx_processes_org_template_workspace;
drop index if exists idx_processes_product;

alter table processes drop column if exists product_id;

create index if not exists idx_processes_org_template
  on processes(organization_id, template_key);

drop table if exists product_integrations;
drop table if exists products;
