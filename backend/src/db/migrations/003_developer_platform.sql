create table if not exists developer_api_keys (
  id text primary key,
  workspace_id text not null,
  user_id text,
  name text not null,
  public_key text not null unique,
  secret_key_hash text not null unique,
  secret_key_last4 text not null,
  scopes text[] not null default '{}',
  status text not null default 'active',
  expires_at timestamptz,
  last_used_at timestamptz,
  usage_count bigint not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  revoked_at timestamptz,
  rotated_from_key_id text
);

create index if not exists developer_api_keys_workspace_idx on developer_api_keys (workspace_id, created_at desc);
create index if not exists developer_api_keys_public_key_idx on developer_api_keys (public_key);
create index if not exists developer_api_keys_secret_hash_idx on developer_api_keys (secret_key_hash);

create table if not exists developer_api_usage_events (
  id text primary key,
  workspace_id text not null,
  user_id text,
  api_key_id text references developer_api_keys(id) on delete set null,
  route text not null,
  method text not null,
  model text,
  provider text,
  status text not null,
  request_tokens integer not null default 0,
  response_tokens integer not null default 0,
  total_tokens integer not null default 0,
  latency_ms integer not null default 0,
  cost_estimate numeric(12, 6) not null default 0,
  correlation_id text,
  ip_address text,
  user_agent text,
  error_code text,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists developer_api_usage_workspace_idx on developer_api_usage_events (workspace_id, created_at desc);
create index if not exists developer_api_usage_key_idx on developer_api_usage_events (api_key_id, created_at desc);
create index if not exists developer_api_usage_correlation_idx on developer_api_usage_events (correlation_id);

create table if not exists developer_api_quota_state (
  workspace_id text primary key,
  monthly_request_limit integer not null default 100000,
  monthly_token_limit bigint not null default 10000000,
  hard_limit_enabled boolean not null default false,
  credit_balance numeric(12, 4) not null default 0,
  updated_at timestamptz
);

create table if not exists developer_webhook_settings (
  id text primary key,
  workspace_id text not null,
  url text not null,
  event_types text[] not null default '{}',
  signing_secret_hash text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (workspace_id, url)
);
