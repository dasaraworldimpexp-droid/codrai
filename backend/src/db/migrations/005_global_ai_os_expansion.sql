create table if not exists agent_templates (
  id text primary key,
  name text not null,
  category text not null,
  description text not null,
  default_tools jsonb not null default '[]'::jsonb,
  memory_policy jsonb not null default '{}'::jsonb,
  schedule_policy jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists agent_templates_category_idx on agent_templates (category, status);

insert into agent_templates (id, name, category, description, default_tools, memory_policy, schedule_policy, updated_at)
values
  ('agent_template_researcher', 'Research Agent', 'research', 'Autonomous research, web intelligence, source validation, and report generation.', '["web.search","browser.extract","memory.write"]'::jsonb, '{"scopes":["workspace","project","source"]}'::jsonb, '{"supportsScheduledRuns":true}'::jsonb, now()),
  ('agent_template_coder', 'Coding Agent', 'engineering', 'Repository-aware coding, debugging, app generation, and code review.', '["filesystem.read","filesystem.write","terminal.exec","code.execute"]'::jsonb, '{"scopes":["workspace","project","execution"]}'::jsonb, '{"supportsScheduledRuns":true}'::jsonb, now()),
  ('agent_template_operator', 'Business Operator Agent', 'operations', 'Runs business workflows, CRM tasks, automation chains, and customer support operations.', '["api.request","workflow.execute","memory.write"]'::jsonb, '{"scopes":["workspace","organization","customer"]}'::jsonb, '{"supportsScheduledRuns":true}'::jsonb, now()),
  ('agent_template_deployment', 'Deployment Agent', 'devops', 'Builds, validates, deploys, rolls back, and monitors generated applications.', '["terminal.exec","deployment.plan","container.inspect"]'::jsonb, '{"scopes":["workspace","deployment","audit"]}'::jsonb, '{"supportsScheduledRuns":true}'::jsonb, now())
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  default_tools = excluded.default_tools,
  memory_policy = excluded.memory_policy,
  schedule_policy = excluded.schedule_policy,
  updated_at = now();

create table if not exists ai_app_blueprints (
  id text primary key,
  name text not null,
  stack text not null,
  description text not null,
  capabilities jsonb not null default '[]'::jsonb,
  deployment_targets jsonb not null default '[]'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists ai_app_blueprints_stack_idx on ai_app_blueprints (stack, status);

insert into ai_app_blueprints (id, name, stack, description, capabilities, deployment_targets, updated_at)
values
  ('blueprint_react_node_saas', 'React + Node SaaS', 'react-node', 'Full-stack SaaS application with React, Express APIs, auth, dashboard, and deployment manifests.', '["frontend","backend","auth","dashboard","api","docker"]'::jsonb, '["vercel","railway","render","docker","kubernetes"]'::jsonb, now()),
  ('blueprint_next_ai_app', 'Next.js AI App', 'nextjs', 'AI-native web app with server routes, streaming UI, model routing, and production build configuration.', '["frontend","server-routes","streaming","ai","seo"]'::jsonb, '["vercel","docker","kubernetes"]'::jsonb, now()),
  ('blueprint_fastapi_python', 'FastAPI Python Service', 'fastapi', 'Python API backend with typed routes, workers, health checks, and Docker deployment.', '["api","python","workers","docker"]'::jsonb, '["railway","render","docker","kubernetes"]'::jsonb, now()),
  ('blueprint_mobile_companion', 'Mobile Companion App', 'react-native', 'React Native mobile shell for chat, voice, agents, and workspace notifications.', '["mobile","voice","notifications","auth"]'::jsonb, '["expo","eas","app-store","play-store"]'::jsonb, now())
on conflict (id) do update set
  name = excluded.name,
  stack = excluded.stack,
  description = excluded.description,
  capabilities = excluded.capabilities,
  deployment_targets = excluded.deployment_targets,
  updated_at = now();

create table if not exists cloud_deployment_targets (
  id text primary key,
  provider text not null,
  target_type text not null,
  region text not null default 'global',
  config jsonb not null default '{}'::jsonb,
  status text not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists cloud_deployment_targets_provider_idx on cloud_deployment_targets (provider, status);

insert into cloud_deployment_targets (id, provider, target_type, region, config, updated_at)
values
  ('deploy_kubernetes_global', 'kubernetes', 'container_platform', 'global', '{"manifests":"deploy/kubernetes/codrai.yaml","autoscaling":true}'::jsonb, now()),
  ('deploy_aws_fargate', 'aws', 'ecs_fargate', 'multi-region-ready', '{"taskDefinition":"deploy/ecs-fargate/task-definition.json","loadBalancing":true}'::jsonb, now()),
  ('deploy_vercel_edge', 'vercel', 'frontend_edge', 'global', '{"frontend":true,"previewDeployments":true}'::jsonb, now()),
  ('deploy_railway_runtime', 'railway', 'app_runtime', 'regional', '{"backend":true,"postgres":true,"redis":true}'::jsonb, now()),
  ('deploy_render_runtime', 'render', 'app_runtime', 'regional', '{"backend":true,"workers":true}'::jsonb, now())
on conflict (id) do update set
  provider = excluded.provider,
  target_type = excluded.target_type,
  region = excluded.region,
  config = excluded.config,
  updated_at = now();

create table if not exists observability_alert_rules (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  name text not null,
  metric text not null,
  threshold numeric not null,
  severity text not null default 'warning',
  status text not null default 'active',
  channels jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists observability_alert_rules_workspace_idx on observability_alert_rules (workspace_id, status);

create table if not exists api_threat_rules (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  rule_type text not null,
  action text not null,
  config jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists api_threat_rules_workspace_idx on api_threat_rules (workspace_id, rule_type, status);

create table if not exists usage_billing_meters (
  id text primary key,
  workspace_id text references workspaces(id) on delete cascade,
  meter_type text not null,
  unit text not null,
  quantity numeric not null default 0,
  period_start timestamptz not null,
  period_end timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists usage_billing_meters_workspace_idx on usage_billing_meters (workspace_id, period_start desc, meter_type);

insert into model_catalog (id, provider, model, display_name, modality, capabilities, context_window, input_price_per_1k, output_price_per_1k, supports_streaming, status, updated_at)
values
  ('model_grok_4', 'grok', 'grok-4', 'Grok 4', 'text', ARRAY['chat','reasoning','tool-use','structured-output'], 256000, 0.00300000, 0.01500000, true, 'active', now()),
  ('model_deepseek_chat', 'deepseek', 'deepseek-chat', 'DeepSeek Chat', 'text', ARRAY['chat','reasoning','tool-use','structured-output'], 64000, 0.00027000, 0.00110000, true, 'active', now()),
  ('model_mistral_large', 'mistral', 'mistral-large-latest', 'Mistral Large', 'text', ARRAY['chat','reasoning','tool-use','structured-output'], 128000, 0.00200000, 0.00600000, true, 'active', now()),
  ('model_ollama_llama31', 'ollama', 'llama3.1', 'Ollama Llama 3.1 Local', 'text', ARRAY['chat','reasoning','tool-use'], 128000, 0.00000000, 0.00000000, true, 'active', now())
on conflict (id) do update set
  provider = excluded.provider,
  model = excluded.model,
  display_name = excluded.display_name,
  modality = excluded.modality,
  capabilities = excluded.capabilities,
  context_window = excluded.context_window,
  input_price_per_1k = excluded.input_price_per_1k,
  output_price_per_1k = excluded.output_price_per_1k,
  supports_streaming = excluded.supports_streaming,
  status = excluded.status,
  updated_at = now();
