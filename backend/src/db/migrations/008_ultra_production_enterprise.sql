create table if not exists global_ai_router_policies (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  name text not null,
  task_type text not null,
  preferred_providers text[] not null default '{}',
  fallback_providers text[] not null default '{}',
  max_latency_ms integer,
  max_cost numeric(12, 6),
  quality_tier text not null default 'balanced',
  streaming_required boolean not null default false,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (workspace_id, name)
);

create index if not exists global_ai_router_policies_workspace_idx on global_ai_router_policies (workspace_id, task_type, status);

create table if not exists voice_ai_sessions (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  user_id text references users(id) on delete set null,
  provider text not null default 'elevenlabs',
  status text not null default 'created',
  language text not null default 'en',
  voice_id text,
  started_at timestamptz,
  ended_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists voice_ai_sessions_workspace_idx on voice_ai_sessions (workspace_id, status, created_at desc);

create table if not exists voice_ai_turns (
  id text primary key,
  session_id text not null references voice_ai_sessions(id) on delete cascade,
  workspace_id text not null references workspaces(id) on delete cascade,
  role text not null,
  transcript text,
  audio_url text,
  latency_ms integer,
  token_usage jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists voice_ai_turns_session_idx on voice_ai_turns (session_id, created_at asc);

create table if not exists object_storage_configs (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  provider text not null,
  bucket text not null,
  region text not null default 'global',
  encrypted_secret_ref text,
  status text not null default 'configured',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (workspace_id, provider, bucket)
);

create index if not exists object_storage_configs_workspace_idx on object_storage_configs (workspace_id, provider, status);

create table if not exists oauth_provider_configs (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  provider text not null,
  client_id text not null,
  encrypted_client_secret_ref text,
  scopes text[] not null default '{}',
  status text not null default 'configured',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (workspace_id, provider)
);

create index if not exists oauth_provider_configs_workspace_idx on oauth_provider_configs (workspace_id, provider, status);

create table if not exists marketplace_creator_analytics (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  creator_workspace_id text,
  asset_type text not null,
  asset_id text not null,
  installs integer not null default 0,
  active_users integer not null default 0,
  gross_revenue_cents bigint not null default 0,
  conversion_rate numeric(8, 4) not null default 0,
  period_start timestamptz not null,
  period_end timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists marketplace_creator_analytics_workspace_idx on marketplace_creator_analytics (workspace_id, period_start desc, asset_type);

create table if not exists edge_cache_policies (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  route_pattern text not null,
  cache_ttl_seconds integer not null default 60,
  stale_while_revalidate_seconds integer not null default 300,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (workspace_id, route_pattern)
);

create index if not exists edge_cache_policies_workspace_idx on edge_cache_policies (workspace_id, status);

create table if not exists performance_telemetry_rollups (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  metric text not null,
  period_start timestamptz not null,
  period_end timestamptz not null,
  p50 numeric,
  p95 numeric,
  p99 numeric,
  sample_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists performance_telemetry_rollups_workspace_idx on performance_telemetry_rollups (workspace_id, metric, period_start desc);

insert into global_ai_router_policies
  (id, workspace_id, name, task_type, preferred_providers, fallback_providers, max_latency_ms, max_cost, quality_tier, streaming_required, metadata, updated_at)
values
  ('router_policy_default_chat', null, 'Default enterprise chat routing', 'reasoning', ARRAY['openai','anthropic','gemini'], ARRAY['grok','deepseek','mistral','openrouter','ollama'], 2500, 0.050000, 'balanced', true, '{"costAware":true,"latencyAware":true,"qualityScored":true}'::jsonb, now()),
  ('router_policy_default_code', null, 'Default coding routing', 'coding', ARRAY['openai','deepseek','mistral'], ARRAY['anthropic','grok','openrouter','ollama'], 5000, 0.100000, 'premium', true, '{"toolUseRequired":true,"structuredOutput":true}'::jsonb, now()),
  ('router_policy_default_local', null, 'Default local fallback routing', 'reasoning', ARRAY['ollama'], ARRAY['openrouter','deepseek','mistral'], 10000, 0.000000, 'economy', true, '{"localFirst":true}'::jsonb, now())
on conflict (id) do update set
  task_type = excluded.task_type,
  preferred_providers = excluded.preferred_providers,
  fallback_providers = excluded.fallback_providers,
  max_latency_ms = excluded.max_latency_ms,
  max_cost = excluded.max_cost,
  quality_tier = excluded.quality_tier,
  streaming_required = excluded.streaming_required,
  metadata = excluded.metadata,
  updated_at = now();

insert into edge_cache_policies
  (id, workspace_id, route_pattern, cache_ttl_seconds, stale_while_revalidate_seconds, metadata, updated_at)
values
  ('edge_cache_public_models', null, '/api/v1/models', 60, 300, '{"safeForPublicApi":true}'::jsonb, now()),
  ('edge_cache_public_providers', null, '/api/v1/providers', 30, 120, '{"safeForPublicApi":true}'::jsonb, now()),
  ('edge_cache_frontend_assets', null, '/assets/*', 31536000, 86400, '{"immutable":true}'::jsonb, now())
on conflict (id) do update set
  cache_ttl_seconds = excluded.cache_ttl_seconds,
  stale_while_revalidate_seconds = excluded.stale_while_revalidate_seconds,
  metadata = excluded.metadata,
  updated_at = now();
