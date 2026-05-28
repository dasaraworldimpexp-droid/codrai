alter table subscriptions add column if not exists seat_count integer not null default 1;

create table if not exists subscription_seats (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  seats integer not null default 1,
  assigned_by text references users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists subscription_seats_workspace_idx on subscription_seats (workspace_id, created_at desc);

create table if not exists billing_payment_methods (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  provider text not null,
  provider_payment_method_id text,
  brand text,
  last4 text,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists billing_payment_methods_workspace_idx on billing_payment_methods (workspace_id, provider, status);

create table if not exists billing_usage_meters (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  meter_type text not null,
  quantity numeric(18, 6) not null default 0,
  unit text not null default 'event',
  source text not null default 'codrai',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists billing_usage_meters_workspace_idx on billing_usage_meters (workspace_id, meter_type, created_at desc);

insert into enterprise_alerts (id, workspace_id, severity, category, message, status, metadata, created_at)
values (
  'phase9_payment_configuration',
  null,
  'info',
  'billing',
  'Stripe and Razorpay payment gateways are available when production credentials are configured.',
  'open',
  '{"stripe":"STRIPE_SECRET_KEY","razorpay":"RAZORPAY_KEY_ID"}'::jsonb,
  now()
)
on conflict (id) do update set message = excluded.message, metadata = excluded.metadata;
