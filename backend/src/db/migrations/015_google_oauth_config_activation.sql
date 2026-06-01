alter table oauth_provider_configs add column if not exists authorized_origin text;
alter table oauth_provider_configs add column if not exists authorized_redirect text;
alter table oauth_provider_configs add column if not exists redirect_uri text;
alter table oauth_provider_configs add column if not exists last_checked_at timestamptz;
alter table oauth_provider_configs add column if not exists last_error text;

create unique index if not exists oauth_provider_configs_global_provider_idx
  on oauth_provider_configs (provider)
  where workspace_id is null;
