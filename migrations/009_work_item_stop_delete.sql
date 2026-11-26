-- Stop / delete a running flow (work item).
-- status gains 'stopped' (terminal, still visible). Delete is soft: rows keep
-- their history for audit but disappear from every read path.
alter table work_items add column if not exists stopped_at timestamptz;
alter table work_items add column if not exists stopped_by text;
alter table work_items add column if not exists deleted_at timestamptz;
alter table work_items add column if not exists deleted_by text;

create index if not exists idx_work_items_live
  on work_items(process_id)
  where deleted_at is null;
