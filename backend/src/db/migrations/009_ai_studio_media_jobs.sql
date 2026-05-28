create table if not exists ai_studio_media_jobs (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  user_id text references users(id) on delete set null,
  project_id text,
  media_type text not null,
  mode text not null,
  provider text,
  prompt text not null,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  runtime_task_id text,
  runtime_job_id text,
  status text not null default 'created',
  error_message text,
  latency_ms integer,
  cost_estimate numeric(12, 6) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  completed_at timestamptz
);

create index if not exists ai_studio_media_jobs_workspace_idx on ai_studio_media_jobs (workspace_id, media_type, status, created_at desc);
create index if not exists ai_studio_media_jobs_runtime_job_idx on ai_studio_media_jobs (runtime_job_id) where runtime_job_id is not null;

create table if not exists ai_studio_prompt_templates (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  category text not null,
  name text not null,
  prompt text not null,
  parameters jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  unique (workspace_id, category, name)
);

create index if not exists ai_studio_prompt_templates_workspace_idx on ai_studio_prompt_templates (workspace_id, category, status);

insert into ai_studio_prompt_templates (id, workspace_id, category, name, prompt, parameters, updated_at)
values
  ('studio_template_logo', null, 'image', 'AI logo creator', 'Create a premium vector-inspired logo concept for: {{brand}}. Style: modern, memorable, enterprise-grade.', '{"mode":"logo","aspectRatio":"1:1"}'::jsonb, now()),
  ('studio_template_product', null, 'image', 'Product image studio', 'Generate a realistic premium product image for: {{product}}. Use clean studio lighting and commercial composition.', '{"mode":"product","aspectRatio":"4:3"}'::jsonb, now()),
  ('studio_template_cinematic_video', null, 'video', 'Cinematic short video', 'Create a cinematic short video sequence about: {{topic}}. Include motion, atmosphere, and strong opening frame.', '{"mode":"cinematic","duration":"short"}'::jsonb, now()),
  ('studio_template_voiceover', null, 'voice', 'AI podcast voiceover', 'Generate a polished podcast-style voiceover for: {{topic}}. Tone: clear, warm, professional.', '{"mode":"podcast","language":"en"}'::jsonb, now())
on conflict (id) do update set
  category = excluded.category,
  name = excluded.name,
  prompt = excluded.prompt,
  parameters = excluded.parameters,
  status = excluded.status,
  updated_at = now();
