alter table conversations
  add column if not exists archived_at timestamptz;

create index if not exists conversations_workspace_updated_idx
  on conversations (workspace_id, updated_at desc)
  where archived_at is null;
