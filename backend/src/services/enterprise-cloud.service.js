import { randomUUID } from "node:crypto";

export class EnterpriseCloudService {
  constructor({ pool, providerRegistry, providerHealthService, modelRouter }) {
    this.pool = pool;
    this.providerRegistry = providerRegistry;
    this.providerHealthService = providerHealthService;
    this.modelRouter = modelRouter;
  }

  async overview({ workspaceId }) {
    this.#assertPool();
    const [billing, usage, org, models, alerts, audit] = await Promise.all([
      this.billingOverview({ workspaceId }),
      this.apiUsage({ workspaceId }),
      this.organizationOverview({ workspaceId }),
      this.modelMarketplace({ workspaceId }),
      this.pool.query("select * from enterprise_alerts where (workspace_id = $1 or workspace_id is null) order by created_at desc limit 20", [workspaceId]),
      this.pool.query("select action, target_type, target_id, created_at from audit_logs where workspace_id = $1 order by created_at desc limit 20", [workspaceId]),
    ]);
    return {
      billing,
      usage,
      organization: org,
      models,
      alerts: alerts.rows,
      audit: audit.rows,
    };
  }

  async billingOverview({ workspaceId }) {
    this.#assertPool();
    const [plans, subscription, wallet, invoices, developerQuota] = await Promise.all([
      this.pool.query("select * from billing_plans where status = 'active' order by monthly_price_cents asc"),
      this.pool.query("select * from subscriptions where workspace_id = $1 order by created_at desc limit 1", [workspaceId]),
      this.pool.query(
        `insert into credit_wallets (workspace_id, updated_at)
         values ($1, now())
         on conflict (workspace_id) do update set updated_at = credit_wallets.updated_at
         returning *`,
        [workspaceId]
      ),
      this.pool.query("select * from billing_usage_invoices where workspace_id = $1 order by created_at desc limit 10", [workspaceId]),
      this.pool.query("select * from developer_api_quota_state where workspace_id = $1", [workspaceId]),
    ]);
    return {
      plans: plans.rows,
      subscription: subscription.rows[0] || { plan: "free", status: "active", provider: "codrai" },
      wallet: wallet.rows[0],
      invoices: invoices.rows,
      developerQuota: developerQuota.rows[0] || null,
    };
  }

  async setPlan({ workspaceId, userId, plan }) {
    this.#assertPool();
    const planResult = await this.pool.query("select * from billing_plans where tier = $1 and status = 'active'", [plan]);
    if (!planResult.rows[0]) throw Object.assign(new Error("Unknown billing plan."), { statusCode: 400 });
    const selected = planResult.rows[0];
    await this.pool.query(
      `insert into subscriptions (id, workspace_id, provider, plan, status, current_period_start, current_period_end, metadata, created_at, updated_at)
       values ($1, $2, 'codrai', $3, 'active', date_trunc('month', now()), date_trunc('month', now()) + interval '1 month', $4, now(), now())
       on conflict (id) do nothing`,
      [randomUUID(), workspaceId, selected.tier, { source: "manual_plan_selection" }]
    );
    await this.pool.query("update workspaces set plan = $2 where id = $1", [workspaceId, selected.tier]);
    await this.pool.query(
      `insert into developer_api_quota_state (workspace_id, monthly_request_limit, monthly_token_limit, credit_balance, updated_at)
       values ($1, $2, $3, $4, now())
       on conflict (workspace_id) do update set monthly_request_limit = excluded.monthly_request_limit,
                                          monthly_token_limit = excluded.monthly_token_limit,
                                          credit_balance = excluded.credit_balance,
                                          updated_at = now()`,
      [workspaceId, selected.included_requests, selected.included_tokens, selected.included_credits]
    );
    await this.#audit({ workspaceId, userId, action: "billing.plan.updated", targetId: selected.tier });
    return { plan: selected, status: "active" };
  }

  async addCredits({ workspaceId, userId, credits }) {
    this.#assertPool();
    const amount = Number(credits || 0);
    if (!Number.isFinite(amount) || amount <= 0) throw Object.assign(new Error("credits must be a positive number."), { statusCode: 400 });
    const wallet = await this.pool.query(
      `insert into credit_wallets (workspace_id, balance, updated_at)
       values ($1, $2, now())
       on conflict (workspace_id) do update set balance = credit_wallets.balance + excluded.balance, updated_at = now()
       returning *`,
      [workspaceId, amount]
    );
    await this.#audit({ workspaceId, userId, action: "billing.credits.added", targetId: workspaceId, metadata: { credits: amount } });
    return { wallet: wallet.rows[0] };
  }

  async createOrganization({ name, userId, workspaceId }) {
    this.#assertPool();
    const id = randomUUID();
    await this.pool.query(
      `insert into organizations (id, name, owner_id, created_at, updated_at)
       values ($1, $2, $3, now(), now())`,
      [id, name, userId || null]
    );
    if (userId) {
      await this.pool.query(
        `insert into organization_members (organization_id, user_id, role, created_at)
         values ($1, $2, 'admin', now())
         on conflict (organization_id, user_id) do update set role = excluded.role`,
        [id, userId]
      );
    }
    if (workspaceId) {
      await this.pool.query("update workspaces set organization_id = $2 where id = $1", [workspaceId, id]);
    }
    await this.#audit({ workspaceId, userId, action: "organization.created", targetId: id });
    return { id, name, role: "admin" };
  }

  async organizationOverview({ workspaceId, userId }) {
    this.#assertPool();
    const current = await this.pool.query(
      `select o.* from organizations o
       join workspaces w on w.organization_id = o.id
       where w.id = $1
       limit 1`,
      [workspaceId]
    );
    const memberships = userId
      ? await this.pool.query(
        `select o.id, o.name, om.role, o.plan, o.billing_mode
         from organization_members om
         join organizations o on o.id = om.organization_id
         where om.user_id = $1
         order by o.created_at desc`,
        [userId]
      )
      : { rows: [] };
    const workspaces = current.rows[0]
      ? await this.pool.query("select id, name, plan, created_at from workspaces where organization_id = $1 order by created_at desc", [current.rows[0].id])
      : { rows: [] };
    return {
      current: current.rows[0] || null,
      memberships: memberships.rows,
      workspaces: workspaces.rows,
    };
  }

  async gatewayPolicy({ workspaceId }) {
    this.#assertPool();
    const result = await this.pool.query(
      `insert into gateway_policies (workspace_id, updated_at)
       values ($1, now())
       on conflict (workspace_id) do update set updated_at = gateway_policies.updated_at
       returning *`,
      [workspaceId]
    );
    return result.rows[0];
  }

  async updateGatewayPolicy({ workspaceId, userId, policy }) {
    this.#assertPool();
    const allowedIps = policy.allowedIps ?? policy.allowed_ips ?? [];
    const blockedIps = policy.blockedIps ?? policy.blocked_ips ?? [];
    const requireSignedRequests = policy.requireSignedRequests ?? policy.require_signed_requests ?? false;
    const regionalRouting = policy.regionalRouting ?? policy.regional_routing ?? "auto";
    const abuseThreshold = policy.abuseThreshold ?? policy.abuse_threshold ?? 100;
    const result = await this.pool.query(
      `insert into gateway_policies (workspace_id, allowed_ips, blocked_ips, require_signed_requests, regional_routing, abuse_threshold, updated_at)
       values ($1, $2, $3, $4, $5, $6, now())
       on conflict (workspace_id) do update set allowed_ips = excluded.allowed_ips,
                                          blocked_ips = excluded.blocked_ips,
                                          require_signed_requests = excluded.require_signed_requests,
                                          regional_routing = excluded.regional_routing,
                                          abuse_threshold = excluded.abuse_threshold,
                                          updated_at = now()
       returning *`,
      [
        workspaceId,
        Array.isArray(allowedIps) ? allowedIps : [],
        Array.isArray(blockedIps) ? blockedIps : [],
        Boolean(requireSignedRequests),
        regionalRouting,
        Number(abuseThreshold || 100),
      ]
    );
    await this.#audit({ workspaceId, userId, action: "gateway.policy.updated", targetId: workspaceId });
    return result.rows[0];
  }

  async modelMarketplace({ workspaceId }) {
    this.#assertPool();
    const catalog = await this.pool.query("select * from model_catalog where status = 'active' order by provider, display_name");
    const providers = this.providerRegistry?.listProviders?.() || [];
    const providerScores = new Map(providers.map((provider) => [provider.providerName, this.providerHealthService?.scoreProvider?.(provider)]));
    return catalog.rows.map((model) => ({
      ...model,
      providerScore: providerScores.get(model.provider) || null,
      workspaceId,
    }));
  }

  async observability({ workspaceId }) {
    this.#assertPool();
    const [usage, runtimeMetrics, errors, queue] = await Promise.all([
      this.apiUsage({ workspaceId }),
      this.pool.query("select metric, count(*)::int as samples, avg(value)::numeric as avg_value from runtime_telemetry where workspace_id = $1 group by metric order by metric asc limit 50", [workspaceId]).catch(() => ({ rows: [] })),
      this.pool.query("select error_code, count(*)::int as count from developer_api_usage_events where workspace_id = $1 and status <> 'success' group by error_code order by count desc limit 20", [workspaceId]),
      this.pool.query("select status, count(*)::int as count from jobs where workspace_id = $1 group by status", [workspaceId]).catch(() => ({ rows: [] })),
    ]);
    return { usage, runtimeMetrics: runtimeMetrics.rows, errors: errors.rows, queue: queue.rows };
  }

  async apiUsage({ workspaceId }) {
    this.#assertPool();
    const summary = await this.pool.query(
      `select count(*)::int as requests,
              coalesce(sum(total_tokens), 0)::bigint as tokens,
              count(*) filter (where status <> 'success')::int as errors,
              coalesce(avg(latency_ms), 0)::numeric as avg_latency_ms
       from developer_api_usage_events
       where workspace_id = $1 and created_at >= date_trunc('month', now())`,
      [workspaceId]
    );
    const daily = await this.pool.query(
      `select date_trunc('day', created_at) as day, count(*)::int as requests, coalesce(sum(total_tokens), 0)::bigint as tokens
       from developer_api_usage_events
       where workspace_id = $1 and created_at >= now() - interval '30 days'
       group by 1 order by 1 asc`,
      [workspaceId]
    );
    return { summary: summary.rows[0], daily: daily.rows };
  }

  async adminDiagnostics({ workspaceId }) {
    const [overview, gateway, observability, globalAiOs] = await Promise.all([
      this.overview({ workspaceId }),
      this.gatewayPolicy({ workspaceId }),
      this.observability({ workspaceId }),
      this.globalAiOs({ workspaceId }),
    ]);
    return { overview, gateway, observability, globalAiOs };
  }

  async globalAiOs({ workspaceId }) {
    this.#assertPool();
    const [
      orchestration,
      agentPlatform,
      appBuilder,
      deployment,
      marketplace,
      security,
      monetization,
      observability,
      adminCloud,
    ] = await Promise.all([
      this.aiOrchestration({ workspaceId }),
      this.agentPlatform({ workspaceId }),
      this.appBuilderPlatform({ workspaceId }),
      this.deploymentReadiness({ workspaceId }),
      this.marketplaceEcosystem({ workspaceId }),
      this.securityHardening({ workspaceId }),
      this.monetization({ workspaceId }),
      this.enterpriseObservability({ workspaceId }),
      this.adminCloud({ workspaceId }),
    ]);
    return {
      orchestration,
      agentPlatform,
      appBuilder,
      deployment,
      marketplace,
      security,
      monetization,
      observability,
      adminCloud,
      generatedAt: new Date().toISOString(),
    };
  }

  async aiOrchestration({ workspaceId }) {
    this.#assertPool();
    const providers = this.providerRegistry?.listProviders?.() || [];
    const models = await this.modelMarketplace({ workspaceId });
    const latestScores = await this.pool.query(
      `select distinct on (provider, model, task_type) provider, model, task_type, score, requests, avg_latency_ms, estimated_cost, failure_rate, calculated_at
       from model_routing_scores
       where workspace_id = $1
       order by provider, model, task_type, calculated_at desc`,
      [workspaceId]
    );
    return {
      routingMode: "health_cost_latency_weighted",
      fallbackChain: ["openai", "anthropic", "gemini", "grok", "deepseek", "mistral", "ollama"],
      providers: providers.map((provider) => ({
        name: provider.providerName,
        type: provider.providerType,
        capabilities: provider.capabilities || [],
        supportsStreaming: Boolean(provider.supportsStreaming),
        maxTokens: provider.maxTokens || null,
        score: this.providerHealthService?.scoreProvider?.(provider) || null,
      })),
      modelCount: models.length,
      latestScores: latestScores.rows,
    };
  }

  async agentPlatform({ workspaceId }) {
    this.#assertPool();
    const [templates, runs, steps, scheduled] = await Promise.all([
      this.pool.query("select * from agent_templates where status = 'active' order by category, name"),
      this.pool.query("select status, count(*)::int as count from agent_runs where workspace_id = $1 group by status", [workspaceId]).catch(() => ({ rows: [] })),
      this.pool.query(
        `select ars.status, count(*)::int as count
         from agent_run_steps ars
         join agent_runs ar on ar.id = ars.run_id
         where ar.workspace_id = $1
         group by ars.status`,
        [workspaceId]
      ).catch(() => ({ rows: [] })),
      this.pool.query("select count(*)::int as count from jobs where workspace_id = $1 and type like 'agent%' and status in ('queued','running')", [workspaceId]).catch(() => ({ rows: [{ count: 0 }] })),
    ]);
    return {
      templates: templates.rows,
      runs: runs.rows,
      steps: steps.rows,
      scheduledAgents: scheduled.rows[0]?.count || 0,
      capabilities: ["tool_calling", "browser_automation", "workflow_chaining", "background_workers", "self_healing_retries"],
    };
  }

  async appBuilderPlatform({ workspaceId }) {
    this.#assertPool();
    const [blueprints, runs, recentFiles] = await Promise.all([
      this.pool.query("select * from ai_app_blueprints where status = 'active' order by name"),
      this.pool.query("select id, project_id, goal, status, architecture, debug_report, result, created_at, completed_at from app_generation_runs where workspace_id = $1 order by created_at desc limit 20", [workspaceId]).catch(() => ({ rows: [] })),
      this.pool.query("select project_id, count(*)::int as files from project_files where workspace_id = $1 group by project_id order by files desc limit 20", [workspaceId]).catch(() => ({ rows: [] })),
    ]);
    return {
      blueprints: blueprints.rows,
      runs: runs.rows,
      projectFileCounts: recentFiles.rows,
      supportedStacks: ["React", "Next.js", "Node.js", "FastAPI", "Python", "React Native"],
      exportMode: "zip_project_export",
    };
  }

  async deploymentReadiness({ workspaceId }) {
    this.#assertPool();
    const [targets, plans, health] = await Promise.all([
      this.pool.query("select * from cloud_deployment_targets where status = 'available' order by provider, target_type"),
      this.pool.query("select * from deployment_plans where workspace_id = $1 order by created_at desc limit 20", [workspaceId]).catch(() => ({ rows: [] })),
      this.pool.query(
        `select dhc.status, count(*)::int as count
         from deployment_health_checks dhc
         join deployment_plans dp on dp.id = dhc.deployment_plan_id
         where dp.workspace_id = $1
         group by dhc.status`,
        [workspaceId]
      ).catch(() => ({ rows: [] })),
    ]);
    return {
      targets: targets.rows,
      recentPlans: plans.rows,
      health: health.rows,
      cloudStack: ["kubernetes", "ecs_fargate", "docker", "nginx_edge", "cdn_waf_ready", "multi_region_ready"],
    };
  }

  async marketplaceEcosystem({ workspaceId }) {
    this.#assertPool();
    const [extensions, installs, models, blueprints, prompts] = await Promise.all([
      this.pool.query("select category, count(*)::int as count from marketplace_extensions group by category order by category").catch(() => ({ rows: [] })),
      this.pool.query("select status, count(*)::int as count from marketplace_installations where workspace_id = $1 group by status", [workspaceId]).catch(() => ({ rows: [] })),
      this.pool.query("select provider, count(*)::int as count from model_catalog where status = 'active' group by provider order by provider"),
      this.pool.query("select stack, count(*)::int as count from ai_app_blueprints where status = 'active' group by stack order by stack"),
      this.pool.query("select count(*)::int as count from workflow_templates").catch(() => ({ rows: [{ count: 0 }] })),
    ]);
    return {
      extensions: extensions.rows,
      installations: installs.rows,
      models: models.rows,
      blueprints: blueprints.rows,
      workflowTemplates: prompts.rows[0]?.count || 0,
      ecosystems: ["plugins", "models", "workflows", "prompts", "app_blueprints", "agent_templates"],
    };
  }

  async securityHardening({ workspaceId }) {
    this.#assertPool();
    const [gateway, threatRules, audit, alertRules] = await Promise.all([
      this.gatewayPolicy({ workspaceId }),
      this.pool.query("select * from api_threat_rules where workspace_id = $1 or workspace_id is null order by created_at desc limit 50", [workspaceId]),
      this.pool.query("select action, count(*)::int as count from audit_logs where workspace_id = $1 and created_at >= now() - interval '30 days' group by action order by count desc limit 20", [workspaceId]),
      this.pool.query("select * from observability_alert_rules where workspace_id = $1 or workspace_id is null order by created_at desc limit 50", [workspaceId]),
    ]);
    return {
      gateway,
      threatRules: threatRules.rows,
      auditSummary: audit.rows,
      alertRules: alertRules.rows,
      controls: ["jwt", "rbac_foundation", "api_key_hashing", "provider_key_encryption", "hmac_signing", "audit_logs", "rate_limits"],
    };
  }

  async monetization({ workspaceId }) {
    this.#assertPool();
    const [billing, meters, events] = await Promise.all([
      this.billingOverview({ workspaceId }),
      this.pool.query("select meter_type, unit, coalesce(sum(quantity), 0)::numeric as quantity from usage_billing_meters where workspace_id = $1 and period_start >= date_trunc('month', now()) group by meter_type, unit", [workspaceId]),
      this.pool.query("select event_type, status, count(*)::int as count from billing_events where workspace_id = $1 group by event_type, status order by event_type", [workspaceId]),
    ]);
    return {
      billing,
      meters: meters.rows,
      events: events.rows,
      modes: ["stripe_subscriptions", "credit_wallet", "usage_billing", "enterprise_contracts"],
    };
  }

  async enterpriseObservability({ workspaceId }) {
    this.#assertPool();
    const [observability, alerts, providerSnapshot] = await Promise.all([
      this.observability({ workspaceId }),
      this.pool.query("select * from enterprise_alerts where workspace_id = $1 or workspace_id is null order by created_at desc limit 50", [workspaceId]),
      Promise.resolve(this.providerHealthService?.snapshot?.() || {}),
    ]);
    return {
      ...observability,
      alerts: alerts.rows,
      providerSnapshot,
      integrations: ["prometheus_ready", "grafana_ready", "loki_ready", "opentelemetry_ready", "sentry_ready"],
    };
  }

  async adminCloud({ workspaceId }) {
    this.#assertPool();
    const [users, workspaces, apiKeys, jobs] = await Promise.all([
      this.pool.query("select count(*)::int as count from users").catch(() => ({ rows: [{ count: 0 }] })),
      this.pool.query("select count(*)::int as count from workspaces").catch(() => ({ rows: [{ count: 0 }] })),
      this.pool.query("select status, count(*)::int as count from developer_api_keys group by status").catch(() => ({ rows: [] })),
      this.pool.query("select status, count(*)::int as count from jobs where workspace_id = $1 group by status", [workspaceId]).catch(() => ({ rows: [] })),
    ]);
    return {
      users: users.rows[0]?.count || 0,
      workspaces: workspaces.rows[0]?.count || 0,
      apiKeys: apiKeys.rows,
      jobs: jobs.rows,
      centers: ["governance", "workspace_management", "compliance", "usage_monitoring", "provider_controls", "system_diagnostics"],
    };
  }

  async globalControlCenter({ workspaceId }) {
    this.#assertPool();
    const [
      globalAiOs,
      traffic,
      providerHealth,
      websocketTelemetry,
      deployments,
      auditLogs,
      governance,
      security,
      monetization,
      benchmarks,
      router,
      voice,
      cloud,
      performance,
    ] = await Promise.all([
      this.globalAiOs({ workspaceId }),
      this.aiTrafficAnalytics({ workspaceId }),
      this.aiOrchestration({ workspaceId }),
      this.websocketTelemetry({ workspaceId }),
      this.deploymentReadiness({ workspaceId }),
      this.auditLogSummary({ workspaceId }),
      this.teamGovernance({ workspaceId }),
      this.securityPolicyEngine({ workspaceId }),
      this.monetization({ workspaceId }),
      this.providerBenchmarks({ workspaceId }),
      this.globalRouterStatus({ workspaceId }),
      this.voiceAiStatus({ workspaceId }),
      this.cloudReadiness({ workspaceId }),
      this.performanceTelemetry({ workspaceId }),
    ]);
    return {
      globalAiOs,
      traffic,
      providerHealth,
      websocketTelemetry,
      deployments,
      auditLogs,
      governance,
      security,
      monetization,
      benchmarks,
      router,
      voice,
      cloud,
      performance,
      generatedAt: new Date().toISOString(),
    };
  }

  async aiTrafficAnalytics({ workspaceId }) {
    this.#assertPool();
    const [developerUsage, modelUsage, conversations, streams] = await Promise.all([
      this.apiUsage({ workspaceId }),
      this.pool.query(
        `select provider, model, task_type,
                count(*)::int as requests,
                coalesce(sum(input_tokens + output_tokens), 0)::bigint as tokens,
                coalesce(avg(latency_ms), 0)::numeric as avg_latency_ms,
                count(*) filter (where status <> 'completed')::int as errors,
                coalesce(sum(estimated_cost), 0)::numeric as estimated_cost
         from model_usage_events
         where workspace_id = $1 and created_at >= now() - interval '30 days'
         group by provider, model, task_type
         order by requests desc`,
        [workspaceId]
      ),
      this.pool.query("select count(*)::int as count from conversations where workspace_id = $1", [workspaceId]).catch(() => ({ rows: [{ count: 0 }] })),
      this.pool.query("select type, count(*)::int as count from realtime_events where workspace_id = $1 and type like '%stream%' group by type order by count desc limit 20", [workspaceId]).catch(() => ({ rows: [] })),
    ]);
    return {
      developerUsage,
      modelUsage: modelUsage.rows,
      conversations: conversations.rows[0]?.count || 0,
      streams: streams.rows,
    };
  }

  async websocketTelemetry({ workspaceId }) {
    this.#assertPool();
    const [recentEvents, eventTypes, streamEvents] = await Promise.all([
      this.pool.query("select id, channel, type, payload, created_at from realtime_events where workspace_id = $1 order by created_at desc limit 50", [workspaceId]),
      this.pool.query("select type, count(*)::int as count from realtime_events where workspace_id = $1 and created_at >= now() - interval '24 hours' group by type order by count desc limit 25", [workspaceId]),
      this.pool.query("select count(*)::int as count from realtime_events where workspace_id = $1 and created_at >= now() - interval '24 hours' and (type like '%stream%' or type like '%token%' or type like '%websocket%')", [workspaceId]),
    ]);
    return {
      recentEvents: recentEvents.rows,
      eventTypes: eventTypes.rows,
      streamEvents24h: streamEvents.rows[0]?.count || 0,
    };
  }

  async auditLogSummary({ workspaceId }) {
    this.#assertPool();
    const [recent, byAction, byTarget] = await Promise.all([
      this.pool.query("select action, target_type, target_id, metadata, created_at from audit_logs where workspace_id = $1 order by created_at desc limit 50", [workspaceId]),
      this.pool.query("select action, count(*)::int as count from audit_logs where workspace_id = $1 and created_at >= now() - interval '30 days' group by action order by count desc limit 25", [workspaceId]),
      this.pool.query("select target_type, count(*)::int as count from audit_logs where workspace_id = $1 and created_at >= now() - interval '30 days' group by target_type order by count desc limit 25", [workspaceId]),
    ]);
    return { recent: recent.rows, byAction: byAction.rows, byTarget: byTarget.rows };
  }

  async teamGovernance({ workspaceId }) {
    this.#assertPool();
    const [organization, teams, members] = await Promise.all([
      this.organizationOverview({ workspaceId }),
      this.pool.query("select count(*)::int as count from teams where workspace_id = $1", [workspaceId]).catch(() => ({ rows: [{ count: 0 }] })),
      this.pool.query(
        `select om.role, count(*)::int as count
         from organization_members om
         join workspaces w on w.organization_id = om.organization_id
         where w.id = $1
         group by om.role`,
        [workspaceId]
      ).catch(() => ({ rows: [] })),
    ]);
    return {
      organization,
      teams: teams.rows[0]?.count || 0,
      membersByRole: members.rows,
      governanceModes: ["admin_member_roles", "workspace_switching", "shared_billing", "audit_logs", "api_permissions"],
    };
  }

  async securityPolicyEngine({ workspaceId }) {
    this.#assertPool();
    const [hardening, policies, threats] = await Promise.all([
      this.securityHardening({ workspaceId }),
      this.pool.query("select * from enterprise_policy_rules where workspace_id = $1 or workspace_id is null order by policy_type, name", [workspaceId]),
      this.pool.query("select * from api_threat_rules where workspace_id = $1 or workspace_id is null order by created_at desc limit 50", [workspaceId]),
    ]);
    return {
      ...hardening,
      policies: policies.rows,
      threats: threats.rows,
      zeroTrustStatus: "configured_monitoring",
      promptInjectionProtection: "policy_ready",
    };
  }

  async providerBenchmarks({ workspaceId }) {
    this.#assertPool();
    const [benchmarks, latestScores] = await Promise.all([
      this.pool.query(
        `select provider, model, benchmark_type, count(*)::int as runs,
                coalesce(avg(score), 0)::numeric as avg_score,
                coalesce(avg(latency_ms), 0)::numeric as avg_latency_ms,
                coalesce(sum(cost_estimate), 0)::numeric as cost_estimate
         from provider_benchmark_runs
         where workspace_id = $1 or workspace_id is null
         group by provider, model, benchmark_type
         order by avg_score desc, avg_latency_ms asc`,
        [workspaceId]
      ),
      this.pool.query(
        `select distinct on (provider, model, task_type) provider, model, task_type, score, requests, avg_latency_ms, estimated_cost, failure_rate, calculated_at
         from model_routing_scores
         where workspace_id = $1
         order by provider, model, task_type, calculated_at desc`,
        [workspaceId]
      ),
    ]);
    return {
      benchmarks: benchmarks.rows,
      latestScores: latestScores.rows,
      scoringInputs: ["latency", "cost", "success_rate", "timeout_frequency", "streaming_support", "capability_match"],
    };
  }

  async runProviderBenchmarks({ workspaceId, userId }) {
    this.#assertPool();
    const providers = this.providerRegistry?.listProviders?.() || [];
    const results = [];

    for (const provider of providers) {
      const id = randomUUID();
      const startedAt = Date.now();
      try {
        const health = await provider.healthCheck({ workspaceId, userId });
        const latencyMs = Date.now() - startedAt;
        const score = this.#benchmarkScore({ latencyMs, status: health.status, supportsStreaming: provider.supportsStreaming });
        await this.pool.query(
          `insert into provider_benchmark_runs
            (id, workspace_id, provider, model, benchmark_type, score, latency_ms, cost_estimate, status, metadata, verified_by, created_at)
           values ($1, $2, $3, $4, 'health_check', $5, $6, 0, 'completed', $7, $8, now())`,
          [id, workspaceId, provider.providerName, health.sampleModel || provider.defaultModel || null, score, latencyMs, health, health.verifiedBy || "healthCheck"]
        );
        results.push({ provider: provider.providerName, status: "completed", score, latencyMs, health });
      } catch (error) {
        const latencyMs = Date.now() - startedAt;
        await this.pool.query(
          `insert into provider_benchmark_runs
            (id, workspace_id, provider, model, benchmark_type, score, latency_ms, cost_estimate, status, metadata, error_message, verified_by, created_at)
           values ($1, $2, $3, $4, 'health_check', 0, $5, 0, 'blocked', $6, $7, 'healthCheck', now())`,
          [
            id,
            workspaceId,
            provider.providerName,
            provider.defaultModel || null,
            latencyMs,
            { configured: false, supportsStreaming: Boolean(provider.supportsStreaming) },
            error.message,
          ]
        );
        results.push({ provider: provider.providerName, status: "blocked", score: 0, latencyMs, error: error.message });
      }
    }

    await this.#audit({ workspaceId, userId, action: "provider.benchmarks.run", targetId: workspaceId, metadata: { providers: results.length } });
    return { results, summary: this.#benchmarkSummary(results) };
  }

  async recommendRoute({ workspaceId, taskType = "reasoning", qualityTier = "balanced", latencyTargetMs, maxCost, requiredCapabilities = [] }) {
    this.#assertPool();
    const task = {
      workspaceId,
      taskType,
      qualityTier,
      latencyTargetMs: latencyTargetMs ? Number(latencyTargetMs) : undefined,
      maxCost: maxCost !== undefined ? Number(maxCost) : undefined,
      requiredCapabilities,
      input: { text: "CODRAI route recommendation probe" },
      intent: "Recommend provider route without executing model generation.",
    };
    try {
      const route = await this.modelRouter.route(task);
      return {
        status: "routable",
        provider: route.provider.providerName,
        fallbackProviders: route.fallbackProviders.map((provider) => provider.providerName),
        executionMode: route.executionMode,
        policy: route.policy,
        task,
      };
    } catch (error) {
      return {
        status: "blocked",
        error: error.message,
        task,
        availableProviders: (this.providerRegistry?.listProviders?.() || []).map((provider) => ({
          name: provider.providerName,
          type: provider.providerType,
          supportsStreaming: Boolean(provider.supportsStreaming),
          score: this.providerHealthService?.scoreProvider?.(provider) || null,
        })),
      };
    }
  }

  async globalRouterStatus({ workspaceId }) {
    this.#assertPool();
    const [policies, recommendation] = await Promise.all([
      this.pool.query("select * from global_ai_router_policies where workspace_id = $1 or workspace_id is null order by workspace_id nulls last, name", [workspaceId]),
      this.recommendRoute({ workspaceId, taskType: "reasoning", qualityTier: "balanced", latencyTargetMs: 2500 }).catch((error) => ({ status: "blocked", error: error.message })),
    ]);
    return {
      policies: policies.rows,
      recommendation,
      features: ["auto_failover", "cost_aware", "latency_aware", "quality_scored", "provider_health_balanced", "streaming_aware"],
    };
  }

  async voiceAiStatus({ workspaceId }) {
    this.#assertPool();
    const [sessions, turns] = await Promise.all([
      this.pool.query("select status, provider, count(*)::int as count from voice_ai_sessions where workspace_id = $1 group by status, provider", [workspaceId]),
      this.pool.query("select count(*)::int as count, coalesce(avg(latency_ms), 0)::numeric as avg_latency_ms from voice_ai_turns where workspace_id = $1", [workspaceId]),
    ]);
    const elevenlabs = this.providerRegistry?.get?.("elevenlabs");
    let providerStatus = { status: "unavailable", reason: "elevenlabs provider not registered" };
    if (elevenlabs) {
      try {
        const health = await elevenlabs.healthCheck({ workspaceId });
        providerStatus = { status: "active", health };
      } catch (error) {
        providerStatus = { status: "blocked", reason: error.message };
      }
    }
    return {
      provider: providerStatus,
      sessions: sessions.rows,
      turns: turns.rows[0] || { count: 0, avg_latency_ms: 0 },
      capabilities: ["speech_to_text_pipeline_ready", "text_to_speech_provider_ready", "websocket_live_conversation_ready", "streaming_audio_storage_ready"],
    };
  }

  async cloudReadiness({ workspaceId }) {
    this.#assertPool();
    const [storage, oauth, cache, pipelines] = await Promise.all([
      this.pool.query("select provider, bucket, region, status, created_at from object_storage_configs where workspace_id = $1 or workspace_id is null order by provider, bucket", [workspaceId]),
      this.pool.query("select provider, scopes, status, created_at from oauth_provider_configs where workspace_id = $1 or workspace_id is null order by provider", [workspaceId]),
      this.pool.query("select route_pattern, cache_ttl_seconds, stale_while_revalidate_seconds, status from edge_cache_policies where workspace_id = $1 or workspace_id is null order by route_pattern", [workspaceId]),
      this.pool.query("select provider, pipeline_type, status, count(*)::int as count from deployment_pipeline_runs where workspace_id = $1 group by provider, pipeline_type, status", [workspaceId]),
    ]);
    return {
      objectStorage: storage.rows,
      oauthProviders: oauth.rows,
      edgeCachePolicies: cache.rows,
      deploymentPipelines: pipelines.rows,
      readiness: ["kubernetes_manifests", "docker_scaling", "redis_queue_scaling", "cdn_waf_ready", "object_storage_configurable", "centralized_tracing"],
    };
  }

  async performanceTelemetry({ workspaceId }) {
    this.#assertPool();
    const [traces, rollups, requestSummary] = await Promise.all([
      this.pool.query("select path, status_code, latency_ms, created_at from request_traces where workspace_id = $1 order by created_at desc limit 50", [workspaceId]),
      this.pool.query("select * from performance_telemetry_rollups where workspace_id = $1 order by period_start desc limit 50", [workspaceId]),
      this.pool.query(
        `select count(*)::int as requests,
                coalesce(avg(latency_ms), 0)::numeric as avg_latency_ms,
                coalesce(percentile_cont(0.95) within group (order by latency_ms), 0)::numeric as p95_latency_ms,
                count(*) filter (where status_code >= 500)::int as server_errors
         from request_traces
         where workspace_id = $1 and created_at >= now() - interval '24 hours'`,
        [workspaceId]
      ),
    ]);
    return {
      traces: traces.rows,
      rollups: rollups.rows,
      requestSummary: requestSummary.rows[0],
      optimizations: ["route_code_splitting", "request_tracing", "edge_cache_policy", "redis_queue_backpressure", "provider_benchmarking"],
    };
  }

  #benchmarkScore({ latencyMs, status, supportsStreaming }) {
    if (status !== "ok") return 0;
    const latencyPenalty = Math.min(latencyMs / 100, 45);
    const streamingBonus = supportsStreaming ? 10 : 0;
    return Number(Math.max(0, Math.min(100, 92 + streamingBonus - latencyPenalty)).toFixed(4));
  }

  #benchmarkSummary(results) {
    const completed = results.filter((item) => item.status === "completed");
    return {
      total: results.length,
      completed: completed.length,
      blocked: results.length - completed.length,
      avgScore: completed.length ? Number((completed.reduce((sum, item) => sum + Number(item.score || 0), 0) / completed.length).toFixed(4)) : 0,
      avgLatencyMs: completed.length ? Math.round(completed.reduce((sum, item) => sum + Number(item.latencyMs || 0), 0) / completed.length) : 0,
    };
  }

  #assertPool() {
    if (!this.pool) throw new Error("Enterprise cloud systems require PostgreSQL DATABASE_URL.");
  }

  async #audit({ workspaceId, userId, action, targetId, metadata = {} }) {
    await this.pool.query(
      `insert into audit_logs (id, workspace_id, user_id, action, target_type, target_id, metadata, created_at)
       values ($1, $2, $3, $4, 'enterprise_cloud', $5, $6, now())`,
      [randomUUID(), workspaceId || null, userId || null, action, targetId || null, metadata]
    );
  }
}
