alter table users alter column password_hash drop not null;
alter table users add column if not exists auth_provider text not null default 'password';
alter table users add column if not exists last_login_at timestamptz;

create table if not exists oauth_identities (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  provider_type text not null,
  google_id text,
  email text not null,
  full_name text,
  avatar_url text,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create unique index if not exists oauth_identities_provider_google_idx
  on oauth_identities (provider_type, google_id)
  where google_id is not null;

create unique index if not exists oauth_identities_provider_email_idx
  on oauth_identities (provider_type, lower(email));

create index if not exists oauth_identities_user_idx
  on oauth_identities (user_id, provider_type);
