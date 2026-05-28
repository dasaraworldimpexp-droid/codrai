create table if not exists provider_benchmark_runs (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  provider text not null,
  model text,
  benchmark_type text not null,
  score numeric(8, 4) not null default 0,
  latency_ms integer,
  cost_estimate numeric(12, 6) not null default 0,
  status text not null default 'recorded',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists provider_benchmark_runs_workspace_idx on provider_benchmark_runs (workspace_id, provider, created_at desc);

create table if not exists enterprise_policy_rules (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  policy_type text not null,
  name text not null,
  enforcement text not null default 'monitor',
  config jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists enterprise_policy_rules_workspace_idx on enterprise_policy_rules (workspace_id, policy_type, status);

create table if not exists marketplace_revenue_shares (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  asset_type text not null,
  asset_id text not null,
  creator_workspace_id text,
  gross_revenue_cents bigint not null default 0,
  platform_fee_cents bigint not null default 0,
  creator_payout_cents bigint not null default 0,
  currency text not null default 'usd',
  period_start timestamptz not null,
  period_end timestamptz not null,
  status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists marketplace_revenue_shares_workspace_idx on marketplace_revenue_shares (workspace_id, period_start desc, asset_type);

insert into enterprise_policy_rules (id, workspace_id, policy_type, name, enforcement, config, updated_at)
values
  ('policy_zero_trust_default', null, 'zero_trust', 'Default zero trust API posture', 'monitor', '{"requireAuth":true,"leastPrivilege":true,"signedPublicApiSupported":true}'::jsonb, now()),
  ('policy_prompt_injection_default', null, 'ai_safety', 'Prompt injection detection policy', 'monitor', '{"scanUserInputs":true,"scanToolOutputs":true,"blockSecretsInPrompts":true}'::jsonb, now()),
  ('policy_secret_vault_default', null, 'secrets', 'Secret vault handling policy', 'enforce', '{"providerKeysEncrypted":true,"apiSecretsHashed":true,"revealRequiresRotation":true}'::jsonb, now()),
  ('policy_rate_limit_default', null, 'rate_limit', 'Enterprise adaptive rate limit policy', 'enforce', '{"publicApiPerMinute":120,"appApiPerMinute":300,"quotaAware":true}'::jsonb, now())
on conflict (id) do update set
  policy_type = excluded.policy_type,
  name = excluded.name,
  enforcement = excluded.enforcement,
  config = excluded.config,
  status = excluded.status,
  updated_at = now();
