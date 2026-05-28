alter table workspaces add column if not exists organization_id text;
alter table workspaces add column if not exists plan text not null default 'free';
alter table workspaces add column if not exists governance jsonb not null default '{}'::jsonb;

create table if not exists organizations (
  id text primary key,
  name text not null,
  owner_id text references users(id) on delete set null,
  plan text not null default 'free',
  billing_mode text not null default 'self_serve',
  governance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create table if not exists organization_members (
  organization_id text not null references organizations(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index if not exists organization_members_user_idx on organization_members (user_id, created_at desc);
create index if not exists workspaces_organization_idx on workspaces (organization_id);

create table if not exists billing_plans (
  id text primary key,
  name text not null,
  tier text not null unique,
  monthly_price_cents integer not null default 0,
  included_requests integer not null default 0,
  included_tokens bigint not null default 0,
  included_credits numeric(12, 4) not null default 0,
  overage_token_price numeric(12, 8) not null default 0,
  features jsonb not null default '{}'::jsonb,
  stripe_price_id text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

insert into billing_plans (id, name, tier, monthly_price_cents, included_requests, included_tokens, included_credits, overage_token_price, features)
values
  ('plan_free', 'Free', 'free', 0, 1000, 100000, 5, 0.000002, '{"support":"community","workspaces":1}'::jsonb),
  ('plan_pro', 'Pro', 'pro', 2900, 50000, 5000000, 100, 0.0000015, '{"support":"priority","workspaces":3}'::jsonb),
  ('plan_business', 'Business', 'business', 9900, 250000, 25000000, 500, 0.000001, '{"support":"business","workspaces":10,"rbac":true}'::jsonb),
  ('plan_enterprise', 'Enterprise', 'enterprise', 0, 1000000, 100000000, 5000, 0.0000008, '{"support":"dedicated","contract":true,"sso":true,"audit":true}'::jsonb)
on conflict (tier) do update set
  name = excluded.name,
  monthly_price_cents = excluded.monthly_price_cents,
  included_requests = excluded.included_requests,
  included_tokens = excluded.included_tokens,
  included_credits = excluded.included_credits,
  overage_token_price = excluded.overage_token_price,
  features = excluded.features,
  updated_at = now();

alter table subscriptions add column if not exists current_period_start timestamptz;
alter table subscriptions add column if not exists current_period_end timestamptz;
alter table subscriptions add column if not exists cancel_at_period_end boolean not null default false;
alter table subscriptions add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists credit_wallets (
  workspace_id text primary key,
  balance numeric(12, 4) not null default 0,
  currency text not null default 'credits',
  updated_at timestamptz
);

create table if not exists billing_events (
  id text primary key,
  workspace_id text,
  provider text not null,
  event_type text not null,
  provider_event_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'received',
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table if not exists gateway_policies (
  workspace_id text primary key,
  allowed_ips text[] not null default '{}',
  blocked_ips text[] not null default '{}',
  require_signed_requests boolean not null default false,
  regional_routing text not null default 'auto',
  abuse_threshold integer not null default 100,
  updated_at timestamptz
);

create table if not exists model_catalog (
  id text primary key,
  provider text not null,
  model text not null,
  display_name text not null,
  modality text not null default 'text',
  capabilities text[] not null default '{}',
  input_price_per_1k numeric(12, 8) not null default 0,
  output_price_per_1k numeric(12, 8) not null default 0,
  context_window integer,
  supports_streaming boolean not null default false,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (provider, model)
);

insert into model_catalog (id, provider, model, display_name, modality, capabilities, context_window, supports_streaming)
values
  ('model_openai_default', 'openai', 'gpt-4o-mini', 'OpenAI GPT-4o Mini', 'text', ARRAY['chat','reasoning','coding'], 128000, true),
  ('model_anthropic_default', 'anthropic', 'claude-3-5-sonnet', 'Claude 3.5 Sonnet', 'text', ARRAY['chat','reasoning','long-context'], 200000, false),
  ('model_gemini_default', 'gemini', 'gemini-1.5-pro', 'Gemini 1.5 Pro', 'text', ARRAY['chat','reasoning','vision'], 1000000, false),
  ('model_fal_media', 'fal', 'fal-default', 'fal.ai Media Runtime', 'video', ARRAY['image','video'], null, false),
  ('model_stability_image', 'stability', 'stable-image-core', 'Stability Image Core', 'image', ARRAY['image'], null, false),
  ('model_elevenlabs_voice', 'elevenlabs', 'eleven_multilingual_v2', 'ElevenLabs Multilingual Voice', 'voice', ARRAY['voice','speech'], null, false)
on conflict (provider, model) do update set
  display_name = excluded.display_name,
  capabilities = excluded.capabilities,
  context_window = excluded.context_window,
  supports_streaming = excluded.supports_streaming,
  updated_at = now();

create table if not exists enterprise_alerts (
  id text primary key,
  workspace_id text,
  severity text not null default 'info',
  category text not null,
  message text not null,
  status text not null default 'open',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists enterprise_alerts_workspace_idx on enterprise_alerts (workspace_id, status, created_at desc);
