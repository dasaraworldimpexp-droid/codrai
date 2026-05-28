alter table if exists model_usage_events
  add column if not exists project_id text;

create index if not exists model_usage_project_idx
  on model_usage_events (workspace_id, project_id, created_at desc);
