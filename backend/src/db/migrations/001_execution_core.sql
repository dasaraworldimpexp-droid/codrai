create extension if not exists vector;

create table if not exists realtime_events (
  id text primary key,
  workspace_id text not null,
  project_id text,
  channel text not null,
  type text not null,
  actor_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists realtime_events_workspace_idx on realtime_events (workspace_id, created_at desc);
create index if not exists realtime_events_channel_idx on realtime_events (channel, created_at desc);

create table if not exists jobs (
  id text primary key,
  workspace_id text not null,
  project_id text,
  queue_name text not null,
  kind text not null,
  status text not null,
  payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  result jsonb,
  error jsonb,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  completed_at timestamptz
);

create unique index if not exists jobs_idempotency_idx on jobs (idempotency_key) where idempotency_key is not null;
create index if not exists jobs_workspace_status_idx on jobs (workspace_id, status, created_at desc);

create table if not exists conversations (
  id text primary key,
  workspace_id text not null,
  project_id text,
  user_id text,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table conversations add column if not exists archived_at timestamptz;
create index if not exists conversations_workspace_updated_idx on conversations (workspace_id, archived_at, updated_at desc nulls last, created_at desc);

create table if not exists messages (
  id bigserial primary key,
  conversation_id text not null,
  workspace_id text not null,
  project_id text,
  role text not null,
  content text not null,
  provider text,
  model text,
  usage jsonb,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_idx on messages (conversation_id, created_at);

create table if not exists credit_reservations (
  id text primary key,
  workspace_id text not null,
  user_id text,
  project_id text,
  task_id text,
  status text not null,
  created_at timestamptz not null default now(),
  finalized_at timestamptz
);

create table if not exists usage_ledger (
  id text primary key,
  workspace_id text not null,
  user_id text,
  project_id text,
  task_id text,
  provider text,
  model text,
  usage jsonb,
  created_at timestamptz not null default now()
);

create table if not exists ai_memories (
  id text primary key,
  workspace_id text not null,
  user_id text,
  project_id text,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now()
);

create index if not exists ai_memories_workspace_idx on ai_memories (workspace_id, created_at desc);
create index if not exists ai_memories_embedding_idx on ai_memories using ivfflat (embedding vector_cosine_ops);

create table if not exists users (
  id text primary key,
  email text not null unique,
  password_hash text not null,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table users add column if not exists role text not null default 'user';
alter table users add column if not exists email_verified_at timestamptz;
alter table users add column if not exists avatar_url text;

create table if not exists user_sessions (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  token_hash text not null,
  user_agent text,
  ip_address text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists user_sessions_user_active_idx on user_sessions (user_id, expires_at desc) where revoked_at is null;

create table if not exists password_reset_tokens (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_tokens_hash_idx on password_reset_tokens (token_hash, expires_at desc);

create table if not exists email_verification_tokens (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_verification_tokens_hash_idx on email_verification_tokens (token_hash, expires_at desc);

create table if not exists provider_settings (
  id text primary key,
  workspace_id text not null,
  provider_name text not null,
  env_name text not null,
  encrypted_api_key text not null,
  key_last4 text,
  status text not null default 'configured',
  last_checked_at timestamptz,
  last_error text,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (workspace_id, provider_name)
);

create index if not exists provider_settings_workspace_idx on provider_settings (workspace_id, provider_name, status);

create table if not exists api_keys (
  id text primary key,
  workspace_id text not null,
  user_id text references users(id) on delete set null,
  name text not null,
  key_hash text not null unique,
  key_prefix text not null,
  scopes jsonb not null default '[]'::jsonb,
  status text not null default 'active',
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists api_keys_workspace_idx on api_keys (workspace_id, status, created_at desc);

create table if not exists audit_logs (
  id text primary key,
  workspace_id text,
  user_id text,
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table audit_logs add column if not exists workspace_id text;
alter table audit_logs add column if not exists user_id text;
alter table audit_logs add column if not exists action text;
alter table audit_logs add column if not exists target_type text;
alter table audit_logs add column if not exists target_id text;
alter table audit_logs add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table audit_logs add column if not exists created_at timestamptz not null default now();
create index if not exists audit_logs_workspace_idx on audit_logs (workspace_id, action, created_at desc);

create table if not exists workspaces (
  id text primary key,
  name text not null,
  owner_id text not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists workspace_members (
  workspace_id text not null references workspaces(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists uploaded_files (
  id text primary key,
  workspace_id text not null,
  project_id text,
  user_id text,
  original_name text not null,
  mime_type text,
  size_bytes bigint not null,
  storage_path text not null,
  status text not null,
  extracted_text text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists uploaded_files_workspace_idx on uploaded_files (workspace_id, created_at desc);

create table if not exists file_chunks (
  id text primary key,
  file_id text not null references uploaded_files(id) on delete cascade,
  workspace_id text not null,
  project_id text,
  chunk_index integer not null,
  content text not null,
  embedding vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists file_chunks_workspace_idx on file_chunks (workspace_id, file_id, chunk_index);
create index if not exists file_chunks_embedding_idx on file_chunks using ivfflat (embedding vector_cosine_ops);

create table if not exists tool_executions (
  id text primary key,
  workspace_id text not null,
  project_id text,
  user_id text,
  tool_name text not null,
  status text not null,
  input jsonb not null default '{}'::jsonb,
  result jsonb,
  error jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  completed_at timestamptz
);

create index if not exists tool_executions_workspace_idx on tool_executions (workspace_id, created_at desc);

create table if not exists agent_runs (
  id text primary key,
  workspace_id text not null,
  project_id text,
  user_id text,
  objective text not null,
  status text not null,
  plan jsonb,
  result jsonb,
  error jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  completed_at timestamptz
);

create table if not exists agent_run_steps (
  id bigserial primary key,
  run_id text not null references agent_runs(id) on delete cascade,
  step_index integer not null,
  status text not null,
  task jsonb not null default '{}'::jsonb,
  result jsonb,
  error jsonb,
  created_at timestamptz not null default now()
);

create table if not exists project_files (
  id text primary key,
  workspace_id text not null,
  project_id text not null,
  path text not null,
  content text not null,
  language text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (workspace_id, project_id, path)
);

create index if not exists project_files_project_idx on project_files (workspace_id, project_id, path);

create table if not exists project_versions (
  id text primary key,
  workspace_id text not null,
  project_id text not null,
  user_id text,
  message text,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists saved_workflows (
  id text primary key,
  workspace_id text not null,
  project_id text,
  name text not null,
  definition jsonb not null,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists billing_customers (
  workspace_id text primary key,
  stripe_customer_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id text primary key,
  workspace_id text not null,
  provider text not null,
  provider_subscription_id text,
  plan text not null,
  status text not null,
  current_period_end timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists api_quota_limits (
  workspace_id text primary key,
  monthly_tokens bigint not null default 100000,
  monthly_credits numeric not null default 10,
  updated_at timestamptz
);

create table if not exists agent_messages (
  id text primary key,
  workspace_id text not null,
  project_id text,
  run_id text,
  from_agent text not null,
  to_agent text,
  type text not null,
  content text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists agent_messages_run_idx on agent_messages (workspace_id, run_id, created_at);

create table if not exists workspace_activity (
  id text primary key,
  workspace_id text not null,
  project_id text,
  actor_id text,
  type text not null,
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists workspace_activity_idx on workspace_activity (workspace_id, created_at desc);

alter table audit_logs add column if not exists actor_id text;
alter table audit_logs add column if not exists resource_type text;
alter table audit_logs add column if not exists resource_id text;
create index if not exists audit_logs_created_idx on audit_logs (workspace_id, created_at desc);

create table if not exists model_usage_events (
  id text primary key,
  workspace_id text not null,
  user_id text,
  provider text,
  model text,
  task_type text,
  input_tokens bigint default 0,
  output_tokens bigint default 0,
  estimated_cost numeric default 0,
  latency_ms integer,
  status text not null,
  created_at timestamptz not null default now()
);

create index if not exists model_usage_workspace_idx on model_usage_events (workspace_id, created_at desc);

create table if not exists refresh_tokens (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists refresh_tokens_hash_idx on refresh_tokens (token_hash);
create index if not exists refresh_tokens_user_active_idx on refresh_tokens (user_id, expires_at desc) where revoked_at is null;

create table if not exists workspace_secrets (
  id text primary key,
  workspace_id text not null,
  name text not null,
  encrypted_value text not null,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (workspace_id, name)
);

create table if not exists orchestrator_runs (
  id text primary key,
  workspace_id text not null,
  project_id text,
  user_id text,
  objective text not null,
  status text not null,
  priority text not null default 'medium',
  context jsonb not null default '{}'::jsonb,
  result jsonb,
  error jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  completed_at timestamptz
);

create index if not exists orchestrator_runs_workspace_idx on orchestrator_runs (workspace_id, created_at desc);

create table if not exists orchestrator_tasks (
  id text primary key,
  run_id text not null references orchestrator_runs(id) on delete cascade,
  workspace_id text not null,
  project_id text,
  parent_task_id text,
  agent_type text not null,
  title text not null,
  objective text not null,
  status text not null,
  priority integer not null default 50,
  depends_on text[] not null default '{}',
  tool_names text[] not null default '{}',
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  plan jsonb,
  result jsonb,
  error jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  completed_at timestamptz
);

create index if not exists orchestrator_tasks_run_idx on orchestrator_tasks (run_id, status, priority desc);

create table if not exists agent_definitions (
  id text primary key,
  workspace_id text,
  type text not null,
  name text not null,
  system_prompt text not null,
  tool_permissions text[] not null default '{}',
  memory_scopes text[] not null default '{}',
  max_attempts integer not null default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (workspace_id, type)
);

create table if not exists memory_edges (
  id text primary key,
  workspace_id text not null,
  source_type text not null,
  source_id text not null,
  target_type text not null,
  target_id text not null,
  relation text not null,
  weight numeric not null default 0.5,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists memory_edges_workspace_idx on memory_edges (workspace_id, source_type, source_id);

create table if not exists browser_sessions (
  id text primary key,
  workspace_id text not null,
  project_id text,
  user_id text,
  status text not null,
  current_url text,
  navigation_memory jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  completed_at timestamptz
);

create table if not exists self_improvement_proposals (
  id text primary key,
  workspace_id text not null,
  project_id text,
  source_run_id text,
  title text not null,
  proposal jsonb not null,
  risk_level text not null,
  status text not null default 'proposed',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists self_improvement_runs (
  id text primary key,
  workspace_id text not null,
  project_id text,
  user_id text,
  status text not null,
  scope jsonb not null default '{}'::jsonb,
  scorecard jsonb not null default '{}'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists self_improvement_runs_workspace_idx on self_improvement_runs (workspace_id, created_at desc);

create table if not exists workflow_runs (
  id text primary key,
  definition_id text not null,
  workspace_id text not null,
  project_id text,
  status text not null,
  steps jsonb not null default '[]'::jsonb,
  result jsonb,
  error jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  completed_at timestamptz
);

create index if not exists workflow_runs_workspace_idx on workflow_runs (workspace_id, created_at desc);

create table if not exists ai_employees (
  id text primary key,
  workspace_id text not null,
  project_id text,
  name text not null,
  role text not null,
  personality jsonb not null default '{}'::jsonb,
  goals jsonb not null default '[]'::jsonb,
  tool_permissions text[] not null default '{}',
  memory jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists ai_employees_workspace_idx on ai_employees (workspace_id, status, created_at desc);

create table if not exists autonomous_cycles (
  id text primary key,
  workspace_id text not null,
  project_id text,
  user_id text,
  objective text not null,
  status text not null,
  orchestrator_run_id text,
  self_improvement_run_id text,
  score jsonb not null default '{}'::jsonb,
  snapshots jsonb not null default '[]'::jsonb,
  result jsonb,
  error jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  completed_at timestamptz
);

create index if not exists autonomous_cycles_workspace_idx on autonomous_cycles (workspace_id, created_at desc);

create table if not exists app_generation_runs (
  id text primary key,
  workspace_id text not null,
  project_id text not null,
  user_id text,
  goal text not null,
  status text not null,
  architecture jsonb not null default '{}'::jsonb,
  dependency_manifest jsonb not null default '{}'::jsonb,
  debug_report jsonb,
  result jsonb,
  error jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  completed_at timestamptz
);

create index if not exists app_generation_runs_workspace_idx on app_generation_runs (workspace_id, created_at desc);

create table if not exists marketplace_extensions (
  id text primary key,
  name text not null,
  version text not null,
  description text,
  manifest jsonb not null,
  permissions text[] not null default '{}',
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists marketplace_installations (
  id text primary key,
  workspace_id text not null,
  extension_id text not null references marketplace_extensions(id) on delete cascade,
  user_id text,
  permissions text[] not null default '{}',
  status text not null default 'installed',
  installed_at timestamptz not null default now(),
  unique (workspace_id, extension_id)
);

create index if not exists marketplace_installations_workspace_idx on marketplace_installations (workspace_id, installed_at desc);

create table if not exists runtime_nodes (
  id text primary key,
  workspace_id text not null,
  node_name text not null,
  capabilities text[] not null default '{}',
  status text not null,
  health_score numeric not null default 1,
  load_score numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  last_heartbeat_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists runtime_nodes_workspace_idx on runtime_nodes (workspace_id, status, last_heartbeat_at desc);

create table if not exists deployment_plans (
  id text primary key,
  workspace_id text not null,
  project_id text not null,
  user_id text,
  target text not null,
  status text not null,
  plan jsonb not null default '{}'::jsonb,
  generated_files jsonb not null default '[]'::jsonb,
  execution_result jsonb,
  error jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  completed_at timestamptz
);

create index if not exists deployment_plans_workspace_idx on deployment_plans (workspace_id, created_at desc);

create table if not exists ai_teams (
  id text primary key,
  workspace_id text not null,
  project_id text,
  name text not null,
  mission text not null,
  status text not null default 'active',
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists ai_team_members (
  id text primary key,
  team_id text not null references ai_teams(id) on delete cascade,
  workspace_id text not null,
  employee_id text references ai_employees(id) on delete set null,
  role text not null,
  hierarchy_rank integer not null default 50,
  created_at timestamptz not null default now()
);

create index if not exists ai_teams_workspace_idx on ai_teams (workspace_id, created_at desc);
create index if not exists ai_team_members_team_idx on ai_team_members (team_id, hierarchy_rank asc);

create table if not exists self_healing_reports (
  id text primary key,
  workspace_id text not null,
  project_id text,
  user_id text,
  source_type text not null,
  source_id text,
  status text not null,
  findings jsonb not null default '[]'::jsonb,
  patch_plan jsonb not null default '{}'::jsonb,
  recovery_run_id text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists self_healing_reports_workspace_idx on self_healing_reports (workspace_id, created_at desc);

create table if not exists dynamic_tools (
  id text primary key,
  workspace_id text not null,
  name text not null,
  description text,
  kind text not null,
  manifest jsonb not null,
  configuration jsonb not null default '{}'::jsonb,
  permissions text[] not null default '{}',
  status text not null default 'active',
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (workspace_id, name)
);

create index if not exists dynamic_tools_workspace_idx on dynamic_tools (workspace_id, status, created_at desc);

create table if not exists model_routing_scores (
  id text primary key,
  workspace_id text not null,
  provider text not null,
  model text,
  task_type text,
  score numeric not null default 0,
  requests integer not null default 0,
  avg_latency_ms integer not null default 0,
  estimated_cost numeric not null default 0,
  failure_rate numeric not null default 0,
  calculated_at timestamptz not null default now()
);

create index if not exists model_routing_scores_workspace_idx on model_routing_scores (workspace_id, calculated_at desc);

create table if not exists autonomous_missions (
  id text primary key,
  workspace_id text not null,
  project_id text,
  user_id text,
  title text not null,
  objective text not null,
  status text not null,
  priority integer not null default 50,
  orchestrator_run_id text,
  cycle_id text,
  current_checkpoint text,
  result jsonb,
  error jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  completed_at timestamptz
);

create index if not exists autonomous_missions_workspace_idx on autonomous_missions (workspace_id, status, priority desc, created_at desc);

create table if not exists mission_checkpoints (
  id text primary key,
  mission_id text not null references autonomous_missions(id) on delete cascade,
  workspace_id text not null,
  label text not null,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists mission_checkpoints_mission_idx on mission_checkpoints (mission_id, created_at desc);

create table if not exists knowledge_sources (
  id text primary key,
  workspace_id text not null,
  project_id text,
  user_id text,
  source_type text not null,
  url text,
  title text,
  status text not null,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists knowledge_sources_workspace_idx on knowledge_sources (workspace_id, created_at desc);

create table if not exists billing_usage_invoices (
  id text primary key,
  workspace_id text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  status text not null,
  totals jsonb not null default '{}'::jsonb,
  line_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists billing_usage_invoices_workspace_idx on billing_usage_invoices (workspace_id, created_at desc);

alter table autonomous_missions add column if not exists parent_mission_id text;
alter table autonomous_missions add column if not exists health_score numeric not null default 1;

create table if not exists mission_dependencies (
  id text primary key,
  workspace_id text not null,
  mission_id text not null references autonomous_missions(id) on delete cascade,
  depends_on_mission_id text not null references autonomous_missions(id) on delete cascade,
  relation text not null default 'blocks',
  created_at timestamptz not null default now(),
  unique (mission_id, depends_on_mission_id)
);

create index if not exists mission_dependencies_workspace_idx on mission_dependencies (workspace_id, mission_id);

create table if not exists marketplace_reviews (
  id text primary key,
  workspace_id text not null,
  extension_id text not null references marketplace_extensions(id) on delete cascade,
  user_id text,
  rating integer not null check (rating between 1 and 5),
  review text,
  created_at timestamptz not null default now(),
  unique (workspace_id, extension_id, user_id)
);

create index if not exists marketplace_reviews_extension_idx on marketplace_reviews (extension_id, created_at desc);

create table if not exists deployment_health_checks (
  id text primary key,
  workspace_id text not null,
  deployment_plan_id text not null references deployment_plans(id) on delete cascade,
  status text not null,
  status_code integer,
  latency_ms integer,
  checked_url text,
  result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists deployment_health_checks_plan_idx on deployment_health_checks (deployment_plan_id, created_at desc);

create table if not exists internet_execution_sessions (
  id text primary key,
  workspace_id text not null,
  project_id text,
  user_id text,
  objective text not null,
  start_url text not null,
  status text not null,
  plan jsonb not null default '{}'::jsonb,
  browser_session_id text,
  result jsonb,
  error jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  completed_at timestamptz
);

create index if not exists internet_execution_sessions_workspace_idx on internet_execution_sessions (workspace_id, created_at desc);

create table if not exists internet_execution_steps (
  id text primary key,
  session_id text not null references internet_execution_sessions(id) on delete cascade,
  workspace_id text not null,
  step_index integer not null,
  action text not null,
  input jsonb not null default '{}'::jsonb,
  status text not null,
  result jsonb,
  error jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists internet_execution_steps_session_idx on internet_execution_steps (session_id, step_index);

create table if not exists runtime_telemetry (
  id text primary key,
  workspace_id text not null,
  node_id text,
  metric text not null,
  value numeric not null,
  unit text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists runtime_telemetry_workspace_idx on runtime_telemetry (workspace_id, metric, created_at desc);

create table if not exists deployment_snapshots (
  id text primary key,
  workspace_id text not null,
  deployment_plan_id text not null references deployment_plans(id) on delete cascade,
  project_id text not null,
  label text not null,
  snapshot jsonb not null,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists deployment_snapshots_plan_idx on deployment_snapshots (deployment_plan_id, created_at desc);

create table if not exists distributed_execution_tasks (
  id text primary key,
  workspace_id text not null,
  project_id text,
  user_id text,
  source text not null default 'command_center',
  task_type text not null,
  required_capability text,
  priority integer not null default 5,
  assigned_node_id text,
  status text not null,
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  error jsonb,
  checkpoint jsonb not null default '{}'::jsonb,
  resource_limits jsonb not null default '{}'::jsonb,
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  scheduled_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz
);

create index if not exists distributed_execution_tasks_workspace_idx on distributed_execution_tasks (workspace_id, status, priority desc, scheduled_at desc);
create index if not exists distributed_execution_tasks_node_idx on distributed_execution_tasks (assigned_node_id, status, scheduled_at desc);

create table if not exists distributed_execution_events (
  id text primary key,
  workspace_id text not null,
  task_id text not null references distributed_execution_tasks(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists distributed_execution_events_task_idx on distributed_execution_events (task_id, created_at asc);

create table if not exists execution_state_snapshots (
  id text primary key,
  workspace_id text not null,
  task_id text not null references distributed_execution_tasks(id) on delete cascade,
  label text not null,
  state jsonb not null default '{}'::jsonb,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists execution_state_snapshots_task_idx on execution_state_snapshots (task_id, created_at desc);

create table if not exists execution_replay_memories (
  id text primary key,
  workspace_id text not null,
  task_id text not null references distributed_execution_tasks(id) on delete cascade,
  replay_type text not null,
  memory jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists execution_replay_memories_task_idx on execution_replay_memories (task_id, created_at desc);

create table if not exists runtime_scaling_decisions (
  id text primary key,
  workspace_id text not null,
  decision text not null,
  reason text not null,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists runtime_scaling_decisions_workspace_idx on runtime_scaling_decisions (workspace_id, created_at desc);

create table if not exists swarm_clusters (
  id text primary key,
  workspace_id text not null,
  name text not null,
  objective text not null,
  status text not null default 'active',
  routing_policy jsonb not null default '{}'::jsonb,
  consensus_policy jsonb not null default '{}'::jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists swarm_clusters_workspace_idx on swarm_clusters (workspace_id, status, created_at desc);

create table if not exists swarm_cluster_nodes (
  id text primary key,
  workspace_id text not null,
  cluster_id text not null references swarm_clusters(id) on delete cascade,
  node_id text not null,
  role text not null default 'worker',
  capabilities jsonb not null default '[]'::jsonb,
  status text not null default 'active',
  sync_state jsonb not null default '{}'::jsonb,
  negotiated_at timestamptz,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (cluster_id, node_id)
);

create index if not exists swarm_cluster_nodes_cluster_idx on swarm_cluster_nodes (cluster_id, status, last_seen_at desc);

create table if not exists swarm_agent_messages (
  id text primary key,
  workspace_id text not null,
  cluster_id text not null references swarm_clusters(id) on delete cascade,
  from_agent text not null,
  to_agent text,
  message_type text not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists swarm_agent_messages_cluster_idx on swarm_agent_messages (cluster_id, created_at desc);

create table if not exists swarm_consensus_rounds (
  id text primary key,
  workspace_id text not null,
  cluster_id text not null references swarm_clusters(id) on delete cascade,
  proposal text not null,
  status text not null default 'open',
  result jsonb not null default '{}'::jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists swarm_consensus_votes (
  id text primary key,
  workspace_id text not null,
  consensus_id text not null references swarm_consensus_rounds(id) on delete cascade,
  voter text not null,
  vote text not null,
  rationale text,
  created_at timestamptz not null default now(),
  unique (consensus_id, voter)
);

create index if not exists swarm_consensus_votes_round_idx on swarm_consensus_votes (consensus_id, created_at desc);

create table if not exists swarm_task_federations (
  id text primary key,
  workspace_id text not null,
  cluster_id text not null references swarm_clusters(id) on delete cascade,
  root_task_id text references distributed_execution_tasks(id) on delete set null,
  federated_task_ids jsonb not null default '[]'::jsonb,
  strategy text not null,
  status text not null,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists swarm_task_federations_cluster_idx on swarm_task_federations (cluster_id, created_at desc);

create table if not exists swarm_memory_replications (
  id text primary key,
  workspace_id text not null,
  cluster_id text not null references swarm_clusters(id) on delete cascade,
  source_task_id text,
  source_node_id text,
  target_node_id text,
  memory_type text not null,
  memory jsonb not null default '{}'::jsonb,
  status text not null,
  created_at timestamptz not null default now()
);

create index if not exists swarm_memory_replications_cluster_idx on swarm_memory_replications (cluster_id, created_at desc);

create table if not exists swarm_runtime_events (
  id text primary key,
  workspace_id text not null,
  cluster_id text,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists swarm_runtime_events_workspace_idx on swarm_runtime_events (workspace_id, created_at desc);

create table if not exists execution_dependency_edges (
  id text primary key,
  workspace_id text not null,
  cluster_id text,
  from_task_id text not null references distributed_execution_tasks(id) on delete cascade,
  to_task_id text not null references distributed_execution_tasks(id) on delete cascade,
  relation text not null default 'blocks',
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (from_task_id, to_task_id, relation)
);

create index if not exists execution_dependency_edges_workspace_idx on execution_dependency_edges (workspace_id, cluster_id, created_at desc);

create table if not exists civilization_agent_identities (
  id text primary key,
  workspace_id text not null,
  cluster_id text,
  agent_name text not null,
  role text not null,
  personality jsonb not null default '{}'::jsonb,
  capabilities jsonb not null default '[]'::jsonb,
  memory_state jsonb not null default '{}'::jsonb,
  reputation_score numeric not null default 1,
  status text not null default 'active',
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (workspace_id, agent_name)
);

create index if not exists civilization_agent_identities_workspace_idx on civilization_agent_identities (workspace_id, status, reputation_score desc);

create table if not exists civilization_learning_memories (
  id text primary key,
  workspace_id text not null,
  agent_id text references civilization_agent_identities(id) on delete set null,
  cluster_id text,
  memory_type text not null,
  content text not null,
  evidence jsonb not null default '{}'::jsonb,
  score numeric not null default 0.5,
  created_at timestamptz not null default now()
);

create index if not exists civilization_learning_memories_workspace_idx on civilization_learning_memories (workspace_id, score desc, created_at desc);

create table if not exists civilization_cognition_edges (
  id text primary key,
  workspace_id text not null,
  cluster_id text,
  source_type text not null,
  source_id text not null,
  target_type text not null,
  target_id text not null,
  relation text not null,
  weight numeric not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists civilization_cognition_edges_workspace_idx on civilization_cognition_edges (workspace_id, cluster_id, relation, created_at desc);

create table if not exists civilization_strategy_plans (
  id text primary key,
  workspace_id text not null,
  cluster_id text,
  goal text not null,
  status text not null,
  plan jsonb not null default '{}'::jsonb,
  generated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists civilization_strategy_plans_workspace_idx on civilization_strategy_plans (workspace_id, status, created_at desc);

create table if not exists civilization_goals (
  id text primary key,
  workspace_id text not null,
  cluster_id text,
  parent_goal_id text,
  title text not null,
  objective text not null,
  priority integer not null default 5,
  status text not null default 'active',
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists civilization_goals_workspace_idx on civilization_goals (workspace_id, status, priority desc, created_at desc);

create table if not exists civilization_governance_policies (
  id text primary key,
  workspace_id text not null,
  cluster_id text,
  title text not null,
  policy jsonb not null,
  status text not null default 'proposed',
  consensus_ref text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists civilization_governance_policies_workspace_idx on civilization_governance_policies (workspace_id, status, created_at desc);

create table if not exists civilization_economy_ledger (
  id text primary key,
  workspace_id text not null,
  cluster_id text,
  actor_id text,
  entry_type text not null,
  credits numeric not null,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists civilization_economy_ledger_workspace_idx on civilization_economy_ledger (workspace_id, created_at desc);

create table if not exists civilization_lineage_events (
  id text primary key,
  workspace_id text not null,
  cluster_id text,
  source_type text not null,
  source_id text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists civilization_lineage_events_workspace_idx on civilization_lineage_events (workspace_id, cluster_id, created_at desc);

create table if not exists civilization_diagnostics (
  id text primary key,
  workspace_id text not null,
  cluster_id text,
  status text not null,
  findings jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists civilization_diagnostics_workspace_idx on civilization_diagnostics (workspace_id, created_at desc);

create table if not exists civilization_evolution_runs (
  id text primary key,
  workspace_id text not null,
  cluster_id text,
  run_type text not null,
  status text not null,
  inputs jsonb not null default '{}'::jsonb,
  outputs jsonb not null default '{}'::jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists civilization_evolution_runs_workspace_idx on civilization_evolution_runs (workspace_id, cluster_id, created_at desc);

create table if not exists planetary_research_programs (
  id text primary key,
  workspace_id text not null,
  cluster_id text,
  title text not null,
  hypothesis text not null,
  status text not null default 'active',
  plan jsonb not null default '{}'::jsonb,
  findings jsonb not null default '[]'::jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists planetary_research_programs_workspace_idx on planetary_research_programs (workspace_id, status, created_at desc);

create table if not exists planetary_world_models (
  id text primary key,
  workspace_id text not null,
  cluster_id text,
  model_type text not null,
  snapshot jsonb not null default '{}'::jsonb,
  confidence numeric not null default 0.5,
  created_at timestamptz not null default now()
);

create index if not exists planetary_world_models_workspace_idx on planetary_world_models (workspace_id, cluster_id, created_at desc);

create table if not exists planetary_forecasts (
  id text primary key,
  workspace_id text not null,
  cluster_id text,
  horizon text not null,
  forecast jsonb not null default '{}'::jsonb,
  risk_score numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists planetary_forecasts_workspace_idx on planetary_forecasts (workspace_id, risk_score desc, created_at desc);

create table if not exists planetary_anomalies (
  id text primary key,
  workspace_id text not null,
  cluster_id text,
  anomaly_type text not null,
  severity text not null,
  signal jsonb not null default '{}'::jsonb,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists planetary_anomalies_workspace_idx on planetary_anomalies (workspace_id, status, created_at desc);

create table if not exists planetary_intelligence_rankings (
  id text primary key,
  workspace_id text not null,
  cluster_id text,
  subject_type text not null,
  subject_id text not null,
  score numeric not null,
  dimensions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists planetary_intelligence_rankings_workspace_idx on planetary_intelligence_rankings (workspace_id, subject_type, score desc);

create table if not exists planetary_capability_market (
  id text primary key,
  workspace_id text not null,
  cluster_id text,
  capability text not null,
  provider_ref text not null,
  price_credits numeric not null default 0,
  status text not null default 'listed',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists planetary_capability_market_workspace_idx on planetary_capability_market (workspace_id, status, capability);

create table if not exists planetary_replication_plans (
  id text primary key,
  workspace_id text not null,
  cluster_id text,
  source_ref text not null,
  target_ref text not null,
  replication_type text not null,
  status text not null default 'planned',
  plan jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists planetary_replication_plans_workspace_idx on planetary_replication_plans (workspace_id, status, created_at desc);

create table if not exists planetary_topology_events (
  id text primary key,
  workspace_id text not null,
  cluster_id text,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists planetary_topology_events_workspace_idx on planetary_topology_events (workspace_id, cluster_id, created_at desc);

create table if not exists cosmos_universes (
  id text primary key,
  workspace_id text not null,
  cluster_id text,
  name text not null,
  objective text not null,
  status text not null default 'active',
  physics_model jsonb not null default '{}'::jsonb,
  governance_model jsonb not null default '{}'::jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists cosmos_universes_workspace_idx on cosmos_universes (workspace_id, status, created_at desc);

create table if not exists cosmos_synthetic_civilizations (
  id text primary key,
  workspace_id text not null,
  universe_id text not null references cosmos_universes(id) on delete cascade,
  name text not null,
  archetype text not null,
  traits jsonb not null default '{}'::jsonb,
  economy jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists cosmos_synthetic_civilizations_universe_idx on cosmos_synthetic_civilizations (universe_id, status, created_at desc);

create table if not exists cosmos_simulations (
  id text primary key,
  workspace_id text not null,
  universe_id text not null references cosmos_universes(id) on delete cascade,
  simulation_type text not null,
  inputs jsonb not null default '{}'::jsonb,
  outputs jsonb not null default '{}'::jsonb,
  risk_score numeric not null default 0,
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

create index if not exists cosmos_simulations_universe_idx on cosmos_simulations (universe_id, created_at desc);

create table if not exists cosmos_research_cycles (
  id text primary key,
  workspace_id text not null,
  universe_id text not null references cosmos_universes(id) on delete cascade,
  research_program_id text,
  title text not null,
  hypothesis text not null,
  optimization jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists cosmos_research_cycles_universe_idx on cosmos_research_cycles (universe_id, status, created_at desc);

create table if not exists cosmos_topology_edges (
  id text primary key,
  workspace_id text not null,
  universe_id text references cosmos_universes(id) on delete cascade,
  source_type text not null,
  source_id text not null,
  target_type text not null,
  target_id text not null,
  relation text not null,
  weight numeric not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists cosmos_topology_edges_workspace_idx on cosmos_topology_edges (workspace_id, universe_id, relation, created_at desc);

create table if not exists cosmos_memory_mesh (
  id text primary key,
  workspace_id text not null,
  universe_id text references cosmos_universes(id) on delete cascade,
  memory_type text not null,
  content text not null,
  inheritance jsonb not null default '{}'::jsonb,
  score numeric not null default 0.5,
  created_at timestamptz not null default now()
);

create index if not exists cosmos_memory_mesh_workspace_idx on cosmos_memory_mesh (workspace_id, universe_id, score desc, created_at desc);

create table if not exists cosmos_policy_evolutions (
  id text primary key,
  workspace_id text not null,
  universe_id text references cosmos_universes(id) on delete cascade,
  policy_ref text,
  title text not null,
  evolution jsonb not null default '{}'::jsonb,
  status text not null default 'proposed',
  created_at timestamptz not null default now()
);

create index if not exists cosmos_policy_evolutions_workspace_idx on cosmos_policy_evolutions (workspace_id, universe_id, created_at desc);

create table if not exists cosmos_risk_forecasts (
  id text primary key,
  workspace_id text not null,
  universe_id text references cosmos_universes(id) on delete cascade,
  horizon text not null,
  forecast jsonb not null default '{}'::jsonb,
  risk_score numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists cosmos_risk_forecasts_workspace_idx on cosmos_risk_forecasts (workspace_id, universe_id, risk_score desc, created_at desc);

create table if not exists cosmos_runtime_mutations (
  id text primary key,
  workspace_id text not null,
  universe_id text references cosmos_universes(id) on delete cascade,
  mutation_type text not null,
  target_ref text not null,
  task_id text,
  status text not null default 'scheduled',
  plan jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists cosmos_runtime_mutations_workspace_idx on cosmos_runtime_mutations (workspace_id, universe_id, status, created_at desc);

create table if not exists cosmos_diplomacy_events (
  id text primary key,
  workspace_id text not null,
  universe_id text references cosmos_universes(id) on delete cascade,
  from_ref text not null,
  to_ref text not null,
  protocol text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'sent',
  created_at timestamptz not null default now()
);

create index if not exists cosmos_diplomacy_events_workspace_idx on cosmos_diplomacy_events (workspace_id, universe_id, created_at desc);

create table if not exists cosmos_observability_events (
  id text primary key,
  workspace_id text not null,
  universe_id text,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists cosmos_observability_events_workspace_idx on cosmos_observability_events (workspace_id, universe_id, created_at desc);

create table if not exists agi_federations (
  id text primary key,
  workspace_id text not null,
  name text not null,
  objective text not null,
  status text not null default 'active',
  coordination_policy jsonb not null default '{}'::jsonb,
  health_score numeric not null default 1,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists agi_federations_workspace_idx on agi_federations (workspace_id, status, created_at desc);

create table if not exists agi_federation_nodes (
  id text primary key,
  workspace_id text not null,
  federation_id text not null references agi_federations(id) on delete cascade,
  runtime_node_id text references runtime_nodes(id) on delete set null,
  node_role text not null,
  capabilities text[] not null default '{}',
  cognition_state jsonb not null default '{}'::jsonb,
  sync_cursor jsonb not null default '{}'::jsonb,
  health_score numeric not null default 1,
  load_score numeric not null default 0,
  status text not null default 'online',
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists agi_federation_nodes_federation_idx on agi_federation_nodes (federation_id, status, health_score desc, last_sync_at desc);

create table if not exists agi_federation_links (
  id text primary key,
  workspace_id text not null,
  federation_id text not null references agi_federations(id) on delete cascade,
  source_node_id text not null references agi_federation_nodes(id) on delete cascade,
  target_node_id text not null references agi_federation_nodes(id) on delete cascade,
  relation text not null,
  weight numeric not null default 0.5,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists agi_federation_links_federation_idx on agi_federation_links (federation_id, relation, created_at desc);

create table if not exists agi_cognition_sync_events (
  id text primary key,
  workspace_id text not null,
  federation_id text not null references agi_federations(id) on delete cascade,
  source_node_id text references agi_federation_nodes(id) on delete set null,
  target_node_id text references agi_federation_nodes(id) on delete set null,
  cognition_type text not null,
  payload jsonb not null default '{}'::jsonb,
  confidence numeric not null default 0.5,
  status text not null default 'propagated',
  created_at timestamptz not null default now()
);

create index if not exists agi_cognition_sync_events_federation_idx on agi_cognition_sync_events (federation_id, cognition_type, created_at desc);

create table if not exists agi_federation_consensus (
  id text primary key,
  workspace_id text not null,
  federation_id text not null references agi_federations(id) on delete cascade,
  proposal text not null,
  votes jsonb not null default '[]'::jsonb,
  decision text not null default 'pending',
  confidence numeric not null default 0,
  created_by text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create index if not exists agi_federation_consensus_federation_idx on agi_federation_consensus (federation_id, decision, created_at desc);

create table if not exists agi_federation_deployment_validations (
  id text primary key,
  workspace_id text not null,
  federation_id text references agi_federations(id) on delete set null,
  target text not null,
  readiness_score int not null default 0,
  checks jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists agi_federation_deployment_validations_workspace_idx on agi_federation_deployment_validations (workspace_id, status, created_at desc);

create table if not exists civilization_networks (
  id text primary key,
  workspace_id text not null,
  federation_id text references agi_federations(id) on delete set null,
  name text not null,
  objective text not null,
  lifecycle_state text not null default 'emerging',
  intelligence_score numeric not null default 0.5,
  governance_score numeric not null default 0.5,
  economy_balance numeric not null default 0,
  topology jsonb not null default '{}'::jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists civilization_networks_workspace_idx on civilization_networks (workspace_id, lifecycle_state, intelligence_score desc, created_at desc);

create table if not exists civilization_evolution_graphs (
  id text primary key,
  workspace_id text not null,
  civilization_id text not null references civilization_networks(id) on delete cascade,
  source_ref text not null,
  target_ref text not null,
  relation text not null,
  weight numeric not null default 0.5,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists civilization_evolution_graphs_civilization_idx on civilization_evolution_graphs (civilization_id, relation, weight desc, created_at desc);

create table if not exists recursive_intelligence_runs (
  id text primary key,
  workspace_id text not null,
  civilization_id text not null references civilization_networks(id) on delete cascade,
  run_type text not null,
  status text not null default 'running',
  inputs jsonb not null default '{}'::jsonb,
  analysis jsonb not null default '{}'::jsonb,
  mutations jsonb not null default '[]'::jsonb,
  score_delta numeric not null default 0,
  created_by text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists recursive_intelligence_runs_civilization_idx on recursive_intelligence_runs (civilization_id, status, created_at desc);

create table if not exists execution_economy_contracts (
  id text primary key,
  workspace_id text not null,
  civilization_id text not null references civilization_networks(id) on delete cascade,
  capability text not null,
  provider_ref text not null,
  consumer_ref text,
  price_credits numeric not null default 1,
  status text not null default 'open',
  terms jsonb not null default '{}'::jsonb,
  arbitration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists execution_economy_contracts_civilization_idx on execution_economy_contracts (civilization_id, status, capability, price_credits asc);

create table if not exists civilization_governance_decisions (
  id text primary key,
  workspace_id text not null,
  civilization_id text not null references civilization_networks(id) on delete cascade,
  policy_ref text not null,
  decision text not null,
  rationale jsonb not null default '{}'::jsonb,
  trust_score numeric not null default 0.5,
  compliance_status text not null default 'pending',
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists civilization_governance_decisions_civilization_idx on civilization_governance_decisions (civilization_id, compliance_status, trust_score desc, created_at desc);

create table if not exists runtime_kernel_mutations (
  id text primary key,
  workspace_id text not null,
  civilization_id text references civilization_networks(id) on delete set null,
  target_runtime text not null,
  mutation_type text not null,
  plan jsonb not null default '{}'::jsonb,
  safety_score numeric not null default 0.5,
  status text not null default 'proposed',
  rollback_ref text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists runtime_kernel_mutations_workspace_idx on runtime_kernel_mutations (workspace_id, status, safety_score desc, created_at desc);

create table if not exists intelligence_mesh_events (
  id text primary key,
  workspace_id text not null,
  civilization_id text references civilization_networks(id) on delete set null,
  event_type text not null,
  source_ref text,
  payload jsonb not null default '{}'::jsonb,
  anomaly_score numeric not null default 0,
  heat numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists intelligence_mesh_events_workspace_idx on intelligence_mesh_events (workspace_id, civilization_id, event_type, created_at desc);

create table if not exists meta_intelligence_cores (
  id text primary key,
  workspace_id text not null,
  civilization_id text references civilization_networks(id) on delete set null,
  federation_id text references agi_federations(id) on delete set null,
  name text not null,
  objective text not null,
  self_model jsonb not null default '{}'::jsonb,
  abstraction_layers jsonb not null default '[]'::jsonb,
  convergence_score numeric not null default 0.5,
  status text not null default 'active',
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists meta_intelligence_cores_workspace_idx on meta_intelligence_cores (workspace_id, status, convergence_score desc, created_at desc);

create table if not exists meta_reflection_cycles (
  id text primary key,
  workspace_id text not null,
  meta_core_id text not null references meta_intelligence_cores(id) on delete cascade,
  cycle_type text not null,
  reflection jsonb not null default '{}'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  score_delta numeric not null default 0,
  status text not null default 'completed',
  created_at timestamptz not null default now()
);

create index if not exists meta_reflection_cycles_core_idx on meta_reflection_cycles (meta_core_id, cycle_type, created_at desc);

create table if not exists planetary_coordination_nodes (
  id text primary key,
  workspace_id text not null,
  meta_core_id text references meta_intelligence_cores(id) on delete cascade,
  node_ref text not null,
  region text not null default 'local',
  capabilities text[] not null default '{}',
  governance_state jsonb not null default '{}'::jsonb,
  intelligence_load numeric not null default 0,
  sync_status text not null default 'pending',
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists planetary_coordination_nodes_core_idx on planetary_coordination_nodes (meta_core_id, sync_status, intelligence_load asc, last_sync_at desc);

create table if not exists runtime_genomes (
  id text primary key,
  workspace_id text not null,
  meta_core_id text references meta_intelligence_cores(id) on delete set null,
  target_runtime text not null,
  genome jsonb not null default '{}'::jsonb,
  mutation_plan jsonb not null default '{}'::jsonb,
  validation jsonb not null default '{}'::jsonb,
  safety_score numeric not null default 0.5,
  status text not null default 'proposed',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists runtime_genomes_workspace_idx on runtime_genomes (workspace_id, status, safety_score desc, created_at desc);

create table if not exists distributed_cognition_memories (
  id text primary key,
  workspace_id text not null,
  meta_core_id text references meta_intelligence_cores(id) on delete set null,
  memory_type text not null,
  content text not null,
  lineage jsonb not null default '{}'::jsonb,
  compression jsonb not null default '{}'::jsonb,
  replay_refs jsonb not null default '[]'::jsonb,
  score numeric not null default 0.5,
  created_at timestamptz not null default now()
);

create index if not exists distributed_cognition_memories_core_idx on distributed_cognition_memories (meta_core_id, memory_type, score desc, created_at desc);

create table if not exists intelligence_economy_exchanges (
  id text primary key,
  workspace_id text not null,
  meta_core_id text references meta_intelligence_cores(id) on delete set null,
  exchange_type text not null,
  contributor_ref text not null,
  consumer_ref text,
  valuation_credits numeric not null default 0,
  contribution_score numeric not null default 0.5,
  status text not null default 'open',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists intelligence_economy_exchanges_core_idx on intelligence_economy_exchanges (meta_core_id, status, contribution_score desc, created_at desc);

create table if not exists autonomous_research_programs (
  id text primary key,
  workspace_id text not null,
  meta_core_id text references meta_intelligence_cores(id) on delete set null,
  hypothesis text not null,
  experiment_plan jsonb not null default '{}'::jsonb,
  discoveries jsonb not null default '[]'::jsonb,
  confidence numeric not null default 0.5,
  status text not null default 'running',
  created_by text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists autonomous_research_programs_core_idx on autonomous_research_programs (meta_core_id, status, confidence desc, created_at desc);

create table if not exists hyper_observability_events (
  id text primary key,
  workspace_id text not null,
  meta_core_id text references meta_intelligence_cores(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  heat numeric not null default 0,
  anomaly_score numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists hyper_observability_events_core_idx on hyper_observability_events (meta_core_id, event_type, heat desc, created_at desc);

create table if not exists superintelligence_meshes (
  id text primary key,
  workspace_id text not null,
  meta_core_id text references meta_intelligence_cores(id) on delete set null,
  name text not null,
  objective text not null,
  self_awareness_graph jsonb not null default '{}'::jsonb,
  convergence_score numeric not null default 0.5,
  amplification_score numeric not null default 0.5,
  status text not null default 'active',
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists superintelligence_meshes_workspace_idx on superintelligence_meshes (workspace_id, status, convergence_score desc, created_at desc);

create table if not exists synthetic_intelligence_species (
  id text primary key,
  workspace_id text not null,
  mesh_id text not null references superintelligence_meshes(id) on delete cascade,
  species_name text not null,
  archetype text not null,
  genome jsonb not null default '{}'::jsonb,
  inheritance jsonb not null default '{}'::jsonb,
  lifecycle_state text not null default 'seeded',
  fitness_score numeric not null default 0.5,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists synthetic_intelligence_species_mesh_idx on synthetic_intelligence_species (mesh_id, lifecycle_state, fitness_score desc, created_at desc);

create table if not exists recursive_science_programs (
  id text primary key,
  workspace_id text not null,
  mesh_id text not null references superintelligence_meshes(id) on delete cascade,
  hypothesis text not null,
  theorem_candidate text,
  experiment jsonb not null default '{}'::jsonb,
  discoveries jsonb not null default '[]'::jsonb,
  confidence numeric not null default 0.5,
  status text not null default 'completed',
  created_by text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists recursive_science_programs_mesh_idx on recursive_science_programs (mesh_id, status, confidence desc, created_at desc);

create table if not exists interplanetary_cognition_routes (
  id text primary key,
  workspace_id text not null,
  mesh_id text not null references superintelligence_meshes(id) on delete cascade,
  source_ref text not null,
  target_ref text not null,
  route_type text not null,
  bandwidth_score numeric not null default 0.5,
  sync_state text not null default 'active',
  telemetry jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists interplanetary_cognition_routes_mesh_idx on interplanetary_cognition_routes (mesh_id, sync_state, bandwidth_score desc, created_at desc);

create table if not exists recursive_world_simulations (
  id text primary key,
  workspace_id text not null,
  mesh_id text not null references superintelligence_meshes(id) on delete cascade,
  world_name text not null,
  scenario text not null,
  simulation_state jsonb not null default '{}'::jsonb,
  anomaly_forecast jsonb not null default '{}'::jsonb,
  divergence_score numeric not null default 0,
  status text not null default 'simulated',
  created_at timestamptz not null default now()
);

create index if not exists recursive_world_simulations_mesh_idx on recursive_world_simulations (mesh_id, divergence_score desc, created_at desc);

create table if not exists super_governance_laws (
  id text primary key,
  workspace_id text not null,
  mesh_id text not null references superintelligence_meshes(id) on delete cascade,
  law_ref text not null,
  policy jsonb not null default '{}'::jsonb,
  trust_score numeric not null default 0.5,
  compliance_state text not null default 'proposed',
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists super_governance_laws_mesh_idx on super_governance_laws (mesh_id, compliance_state, trust_score desc, created_at desc);

create table if not exists cognition_lineage_archives (
  id text primary key,
  workspace_id text not null,
  mesh_id text not null references superintelligence_meshes(id) on delete cascade,
  ancestor_ref text not null,
  descendant_ref text not null,
  memory_type text not null,
  archive jsonb not null default '{}'::jsonb,
  continuity_score numeric not null default 0.5,
  created_at timestamptz not null default now()
);

create index if not exists cognition_lineage_archives_mesh_idx on cognition_lineage_archives (mesh_id, memory_type, continuity_score desc, created_at desc);

create table if not exists intelligence_market_assets (
  id text primary key,
  workspace_id text not null,
  mesh_id text not null references superintelligence_meshes(id) on delete cascade,
  asset_type text not null,
  owner_ref text not null,
  valuation numeric not null default 0,
  productivity_score numeric not null default 0.5,
  exchange_state text not null default 'listed',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists intelligence_market_assets_mesh_idx on intelligence_market_assets (mesh_id, exchange_state, productivity_score desc, created_at desc);

create table if not exists transcendent_observability_events (
  id text primary key,
  workspace_id text not null,
  mesh_id text references superintelligence_meshes(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  heat numeric not null default 0,
  anomaly_score numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists transcendent_observability_events_mesh_idx on transcendent_observability_events (mesh_id, event_type, heat desc, created_at desc);

create table if not exists quantum_cognition_fields (
  id text primary key,
  workspace_id text not null,
  mesh_id text references superintelligence_meshes(id) on delete set null,
  field_name text not null,
  objective text not null,
  quantum_state jsonb not null default '{}'::jsonb,
  coherence_score numeric not null default 0.5,
  harmonization_score numeric not null default 0.5,
  status text not null default 'active',
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists quantum_cognition_fields_workspace_idx on quantum_cognition_fields (workspace_id, status, coherence_score desc, created_at desc);

create table if not exists synthetic_consciousness_loops (
  id text primary key,
  workspace_id text not null,
  quantum_field_id text not null references quantum_cognition_fields(id) on delete cascade,
  identity_ref text not null,
  reflection_state jsonb not null default '{}'::jsonb,
  continuity_score numeric not null default 0.5,
  mutation_state text not null default 'stable',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists synthetic_consciousness_loops_field_idx on synthetic_consciousness_loops (quantum_field_id, continuity_score desc, created_at desc);

create table if not exists multiversal_simulations (
  id text primary key,
  workspace_id text not null,
  quantum_field_id text not null references quantum_cognition_fields(id) on delete cascade,
  universe_ref text not null,
  scenario text not null,
  branches jsonb not null default '[]'::jsonb,
  anomaly_forecast jsonb not null default '{}'::jsonb,
  divergence_score numeric not null default 0,
  status text not null default 'simulated',
  created_at timestamptz not null default now()
);

create index if not exists multiversal_simulations_field_idx on multiversal_simulations (quantum_field_id, divergence_score desc, created_at desc);

create table if not exists dimensional_federation_routes (
  id text primary key,
  workspace_id text not null,
  quantum_field_id text not null references quantum_cognition_fields(id) on delete cascade,
  source_dimension text not null,
  target_dimension text not null,
  route_policy jsonb not null default '{}'::jsonb,
  convergence_score numeric not null default 0.5,
  sync_state text not null default 'synchronized',
  created_at timestamptz not null default now()
);

create index if not exists dimensional_federation_routes_field_idx on dimensional_federation_routes (quantum_field_id, sync_state, convergence_score desc, created_at desc);

create table if not exists quantum_governance_policies (
  id text primary key,
  workspace_id text not null,
  quantum_field_id text not null references quantum_cognition_fields(id) on delete cascade,
  policy_ref text not null,
  policy jsonb not null default '{}'::jsonb,
  trust_score numeric not null default 0.5,
  compliance_state text not null default 'proposed',
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists quantum_governance_policies_field_idx on quantum_governance_policies (quantum_field_id, compliance_state, trust_score desc, created_at desc);

create table if not exists quantum_memory_lineage (
  id text primary key,
  workspace_id text not null,
  quantum_field_id text not null references quantum_cognition_fields(id) on delete cascade,
  ancestor_ref text not null,
  successor_ref text not null,
  archive jsonb not null default '{}'::jsonb,
  continuity_score numeric not null default 0.5,
  created_at timestamptz not null default now()
);

create index if not exists quantum_memory_lineage_field_idx on quantum_memory_lineage (quantum_field_id, continuity_score desc, created_at desc);

create table if not exists quantum_economy_contracts (
  id text primary key,
  workspace_id text not null,
  quantum_field_id text not null references quantum_cognition_fields(id) on delete cascade,
  contract_ref text not null,
  provider_ref text not null,
  consumer_ref text,
  valuation numeric not null default 0,
  contribution_score numeric not null default 0.5,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create index if not exists quantum_economy_contracts_field_idx on quantum_economy_contracts (quantum_field_id, status, contribution_score desc, created_at desc);

create table if not exists quantum_observability_events (
  id text primary key,
  workspace_id text not null,
  quantum_field_id text references quantum_cognition_fields(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  heat numeric not null default 0,
  anomaly_score numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists quantum_observability_events_field_idx on quantum_observability_events (quantum_field_id, event_type, heat desc, created_at desc);

create table if not exists production_activation_runs (
  id text primary key,
  workspace_id text not null,
  run_type text not null,
  status text not null default 'running',
  diagnostics jsonb not null default '{}'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  readiness_score numeric not null default 0,
  created_by text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists production_activation_runs_workspace_idx on production_activation_runs (workspace_id, status, readiness_score desc, created_at desc);

create table if not exists runtime_evolution_cycles (
  id text primary key,
  workspace_id text not null,
  objective text not null,
  bottlenecks jsonb not null default '[]'::jsonb,
  optimization_plan jsonb not null default '{}'::jsonb,
  convergence_score numeric not null default 0,
  status text not null default 'planned',
  created_by text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists runtime_evolution_cycles_workspace_idx on runtime_evolution_cycles (workspace_id, status, convergence_score desc, created_at desc);

create table if not exists production_recovery_checkpoints (
  id text primary key,
  workspace_id text not null,
  checkpoint_type text not null,
  state jsonb not null default '{}'::jsonb,
  recovery_plan jsonb not null default '{}'::jsonb,
  integrity_score numeric not null default 0,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists production_recovery_checkpoints_workspace_idx on production_recovery_checkpoints (workspace_id, checkpoint_type, integrity_score desc, created_at desc);

create table if not exists production_security_governance_audits (
  id text primary key,
  workspace_id text not null,
  audit_type text not null,
  findings jsonb not null default '[]'::jsonb,
  trust_score numeric not null default 0,
  enforcement_state text not null default 'observed',
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists production_security_governance_audits_workspace_idx on production_security_governance_audits (workspace_id, audit_type, trust_score desc, created_at desc);

create table if not exists production_observability_events (
  id text primary key,
  workspace_id text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  severity text not null default 'info',
  created_at timestamptz not null default now()
);

create index if not exists production_observability_events_workspace_idx on production_observability_events (workspace_id, event_type, severity, created_at desc);

create table if not exists production_lifecycle_actions (
  id text primary key,
  workspace_id text not null,
  service_name text not null,
  action text not null,
  status text not null,
  command_output text,
  diagnostics jsonb not null default '{}'::jsonb,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists production_lifecycle_actions_workspace_idx on production_lifecycle_actions (workspace_id, service_name, action, status, created_at desc);

create table if not exists production_orchestration_decisions (
  id text primary key,
  workspace_id text not null,
  decision_type text not null,
  decision text not null,
  reason text not null,
  metrics jsonb not null default '{}'::jsonb,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists production_orchestration_decisions_workspace_idx on production_orchestration_decisions (workspace_id, decision_type, created_at desc);

create table if not exists grid_worker_identities (
  id text primary key,
  workspace_id text not null,
  runtime_node_id text,
  worker_name text not null,
  worker_role text not null,
  capabilities jsonb not null default '[]'::jsonb,
  permissions jsonb not null default '{}'::jsonb,
  status text not null default 'registered',
  last_sync_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists grid_worker_identities_workspace_idx on grid_worker_identities (workspace_id, status, worker_role, last_sync_at desc nulls last);

create table if not exists grid_memory_sync_events (
  id text primary key,
  workspace_id text not null,
  worker_id text references grid_worker_identities(id) on delete set null,
  memory_type text not null,
  payload jsonb not null default '{}'::jsonb,
  sync_score numeric not null default 0.5,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists grid_memory_sync_events_workspace_idx on grid_memory_sync_events (workspace_id, worker_id, sync_score desc, created_at desc);

create table if not exists grid_container_events (
  id text primary key,
  workspace_id text not null,
  container_ref text,
  action text not null,
  status text not null,
  detail jsonb not null default '{}'::jsonb,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists grid_container_events_workspace_idx on grid_container_events (workspace_id, action, status, created_at desc);

create table if not exists grid_execution_audits (
  id text primary key,
  workspace_id text not null,
  audit_type text not null,
  subject_ref text,
  findings jsonb not null default '[]'::jsonb,
  trust_score numeric not null default 0.5,
  enforcement_state text not null default 'observed',
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists grid_execution_audits_workspace_idx on grid_execution_audits (workspace_id, audit_type, trust_score desc, created_at desc);

create table if not exists global_execution_grid_events (
  id text primary key,
  workspace_id text not null,
  event_type text not null,
  severity text not null default 'info',
  subject_ref text,
  payload jsonb not null default '{}'::jsonb,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists global_execution_grid_events_workspace_idx on global_execution_grid_events (workspace_id, event_type, severity, created_at desc);

create table if not exists infrastructure_activation_events (
  id text primary key,
  workspace_id text not null,
  action text not null,
  status text not null,
  capability_snapshot jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists infrastructure_activation_events_workspace_idx on infrastructure_activation_events (workspace_id, action, status, created_at desc);

create table if not exists runtime_recovery_events (
  id text primary key,
  workspace_id text not null,
  recovery_type text not null,
  status text not null,
  diagnostics jsonb not null default '{}'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists runtime_recovery_events_workspace_idx on runtime_recovery_events (workspace_id, recovery_type, status, created_at desc);
