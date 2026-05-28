create table if not exists multimodal_transcripts (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  project_id text,
  user_id text references users(id) on delete set null,
  file_name text,
  mime_type text,
  status text not null default 'created',
  language text not null default 'auto',
  transcript text,
  subtitles jsonb not null default '[]'::jsonb,
  preprocessing jsonb not null default '{}'::jsonb,
  runtime jsonb not null default '{}'::jsonb,
  error_message text,
  latency_ms integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  completed_at timestamptz
);

create index if not exists multimodal_transcripts_workspace_idx on multimodal_transcripts (workspace_id, status, created_at desc);
create index if not exists multimodal_transcripts_project_idx on multimodal_transcripts (workspace_id, project_id, created_at desc) where project_id is not null;

insert into users (id, email, password_hash, name, role, email_verified_at, created_at, updated_at)
values ('local-user', 'local@codrai.local', 'local-runtime-user', 'Local CODRAI Runtime', 'admin', now(), now(), now())
on conflict (id) do nothing;

insert into workspaces (id, name, owner_id, created_at)
values ('local-workspace', 'Local CODRAI Workspace', 'local-user', now())
on conflict (id) do nothing;

insert into workspace_members (workspace_id, user_id, role, created_at)
values ('local-workspace', 'local-user', 'owner', now())
on conflict (workspace_id, user_id) do nothing;
