create table if not exists request_traces (
  id text primary key,
  workspace_id text references workspaces(id) on delete set null,
  user_id text references users(id) on delete set null,
  method text not null,
  path text not null,
  status_code integer,
  latency_ms integer not null default 0,
  user_agent text,
  ip_address text,
  request_bytes integer not null default 0,
  response_bytes integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists request_traces_workspace_idx on request_traces (workspace_id, created_at desc);
create index if not exists request_traces_path_idx on request_traces (path, status_code, created_at desc);

create table if not exists tenant_access_policies (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  policy_name text not null,
  policy_type text not null,
  enforcement text not null default 'monitor',
  config jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (workspace_id, policy_name)
);

create index if not exists tenant_access_policies_workspace_idx on tenant_access_policies (workspace_id, policy_type, status);

create table if not exists deployment_pipeline_runs (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  deployment_plan_id text references deployment_plans(id) on delete set null,
  provider text not null,
  pipeline_type text not null,
  status text not null default 'created',
  steps jsonb not null default '[]'::jsonb,
  logs jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists deployment_pipeline_runs_workspace_idx on deployment_pipeline_runs (workspace_id, status, created_at desc);

alter table provider_benchmark_runs
  add column if not exists error_message text,
  add column if not exists verified_by text;
