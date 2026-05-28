import { ProviderValidationService } from "../core/provider-health/provider-validation.service.js";
import { ProviderSettingsService } from "../services/provider-settings.service.js";

function workspace(req) {
  return req.workspace?.id || req.body.workspaceId || req.query.workspaceId;
}

async function capture(name, fn) {
  const startedAt = Date.now();
  try {
    return {
      name,
      ok: true,
      latencyMs: Date.now() - startedAt,
      data: await fn(),
    };
  } catch (error) {
    return {
      name,
      ok: false,
      latencyMs: Date.now() - startedAt,
      error: error?.message || String(error),
    };
  }
}

function systemStatus(entries) {
  if (entries.some((entry) => !entry.ok)) return "degraded";
  const values = entries.map((entry) => entry.data?.status || entry.data?.diagnostics?.status).filter(Boolean);
  if (values.some((value) => ["blocked", "degraded", "recovery_guarded", "degraded_guarded"].includes(value))) return "degraded";
  return "operational";
}

async function safeRows(pool, sql, params = []) {
  if (!pool) return [];
  try {
    const result = await pool.query(sql, params);
    return result.rows;
  } catch {
    return [];
  }
}

async function tableCount(pool, tableName, workspaceId) {
  const rows = await safeRows(pool, `select count(*)::int as count from ${tableName} where workspace_id = $1`, [workspaceId]);
  return rows[0]?.count || 0;
}

export async function enterpriseCloudOverview(req, res, next) {
  try {
    const result = await req.app.locals.enterpriseCloudService.overview({ workspaceId: workspace(req), userId: req.user?.id });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function enterpriseBilling(req, res, next) {
  try {
    const result = await req.app.locals.enterpriseCloudService.billingOverview({ workspaceId: workspace(req) });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function enterpriseSetPlan(req, res, next) {
  try {
    const result = await req.app.locals.enterpriseCloudService.setPlan({
      workspaceId: workspace(req),
      userId: req.user?.id || req.body.userId,
      plan: req.body.plan,
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function enterpriseAddCredits(req, res, next) {
  try {
    const result = await req.app.locals.enterpriseCloudService.addCredits({
      workspaceId: workspace(req),
      userId: req.user?.id || req.body.userId,
      credits: req.body.credits,
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function enterpriseOrganization(req, res, next) {
  try {
    const result = await req.app.locals.enterpriseCloudService.organizationOverview({
      workspaceId: workspace(req),
      userId: req.user?.id || req.query.userId,
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function enterpriseCreateOrganization(req, res, next) {
  try {
    const result = await req.app.locals.enterpriseCloudService.createOrganization({
      name: req.body.name,
      userId: req.user?.id || req.body.userId,
      workspaceId: workspace(req),
    });
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function enterpriseGatewayPolicy(req, res, next) {
  try {
    const result = await req.app.locals.enterpriseCloudService.gatewayPolicy({ workspaceId: workspace(req) });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function enterpriseUpdateGatewayPolicy(req, res, next) {
  try {
    const result = await req.app.locals.enterpriseCloudService.updateGatewayPolicy({
      workspaceId: workspace(req),
      userId: req.user?.id || req.body.userId,
      policy: req.body,
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function enterpriseModelMarketplace(req, res, next) {
  try {
    const result = await req.app.locals.enterpriseCloudService.modelMarketplace({ workspaceId: workspace(req) });
    return res.status(200).json({ models: result });
  } catch (error) {
    return next(error);
  }
}

export async function enterpriseObservability(req, res, next) {
  try {
    const result = await req.app.locals.enterpriseCloudService.observability({ workspaceId: workspace(req) });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function enterpriseAdminDiagnostics(req, res, next) {
  try {
    const result = await req.app.locals.enterpriseCloudService.adminDiagnostics({ workspaceId: workspace(req) });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function enterpriseGlobalAiOs(req, res, next) {
  try {
    const result = await req.app.locals.enterpriseCloudService.globalAiOs({ workspaceId: workspace(req) });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function enterpriseAiOrchestration(req, res, next) {
  try {
    const result = await req.app.locals.enterpriseCloudService.aiOrchestration({ workspaceId: workspace(req) });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function enterpriseAgentPlatform(req, res, next) {
  try {
    const result = await req.app.locals.enterpriseCloudService.agentPlatform({ workspaceId: workspace(req) });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function enterpriseAppBuilderPlatform(req, res, next) {
  try {
    const result = await req.app.locals.enterpriseCloudService.appBuilderPlatform({ workspaceId: workspace(req) });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function enterpriseDeploymentReadiness(req, res, next) {
  try {
    const result = await req.app.locals.enterpriseCloudService.deploymentReadiness({ workspaceId: workspace(req) });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function enterpriseMarketplaceEcosystem(req, res, next) {
  try {
    const result = await req.app.locals.enterpriseCloudService.marketplaceEcosystem({ workspaceId: workspace(req) });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function enterpriseSecurityHardening(req, res, next) {
  try {
    const result = await req.app.locals.enterpriseCloudService.securityHardening({ workspaceId: workspace(req) });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function enterpriseGlobalControlCenter(req, res, next) {
  try {
    const result = await req.app.locals.enterpriseCloudService.globalControlCenter({ workspaceId: workspace(req) });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function enterpriseOperatingSystem(req, res, next) {
  try {
    const workspaceId = workspace(req);
    const locals = req.app.locals;
    const probes = await Promise.all([
      capture("aiOrchestration", () => locals.enterpriseCloudService.aiOrchestration({ workspaceId })),
      capture("agentPlatform", () => locals.enterpriseCloudService.agentPlatform({ workspaceId })),
      capture("workflowEngine", () => locals.enterpriseCloudService.globalAiOs({ workspaceId })),
      capture("observability", () => locals.enterpriseCloudService.observability({ workspaceId })),
      capture("security", () => locals.enterpriseCloudService.securityHardening({ workspaceId })),
      capture("deployment", () => locals.enterpriseCloudService.deploymentReadiness({ workspaceId })),
      capture("controlCenter", () => locals.enterpriseCloudService.globalControlCenter({ workspaceId })),
      capture("workers", () => locals.workerSupervisorService.workers({ workspaceId })),
      capture("queues", () => locals.workerSupervisorService.queues({ workspaceId })),
      capture("containers", () => locals.containerRuntimeService.status({ workspaceId })),
      capture("recovery", () => locals.runtimeRecoveryService.status({ workspaceId })),
    ]);

    const providerSnapshot = locals.providerHealthService?.snapshot?.() || {};
    const providers = locals.providerRegistry?.listProviders?.().map((provider) => ({
      name: provider.providerName,
      type: provider.providerType,
      capabilities: provider.capabilities || [],
      qualityTiers: provider.qualityTiers || [],
      supportsStreaming: Boolean(provider.supportsStreaming || provider.stream),
      maxTokens: provider.maxTokens || null,
      score: locals.providerHealthService?.scoreProvider?.(provider) || null,
    })) || [];

    const blocked = probes
      .filter((probe) => !probe.ok || probe.data?.status === "blocked" || probe.data?.diagnostics?.status === "blocked")
      .map((probe) => ({ name: probe.name, error: probe.error || probe.data?.error || probe.data?.diagnostics?.error || null }));

    return res.status(200).json({
      status: systemStatus(probes),
      timestamp: new Date().toISOString(),
      workspaceId,
      providers: {
        total: providers.length,
        streaming: providers.filter((provider) => provider.supportsStreaming).length,
        providers,
        metrics: providerSnapshot.metrics || {},
        healthCache: providerSnapshot.cache || {},
      },
      systems: Object.fromEntries(probes.map((probe) => [probe.name, probe])),
      realtime: {
        eventBus: locals.eventBus?.snapshot?.() || null,
        websocket: locals.websocketServer?.metricsSnapshot?.() || null,
        socketio: locals.socketIoServer?.metricsSnapshot?.() || null,
      },
      readiness: {
        orchestration: probes.find((probe) => probe.name === "aiOrchestration")?.ok ? "wired" : "degraded",
        agents: probes.find((probe) => probe.name === "agentPlatform")?.ok ? "wired" : "degraded",
        workflows: probes.find((probe) => probe.name === "workflowEngine")?.ok ? "wired" : "degraded",
        queues: probes.find((probe) => probe.name === "queues")?.data?.status || "unknown",
        workers: probes.find((probe) => probe.name === "workers")?.data?.status || "unknown",
        containers: probes.find((probe) => probe.name === "containers")?.data?.status || probes.find((probe) => probe.name === "containers")?.data?.docker?.status || "unknown",
        recovery: probes.find((probe) => probe.name === "recovery")?.data?.status || "unknown",
      },
      blocked,
    });
  } catch (error) {
    return next(error);
  }
}

export async function enterpriseAutonomousOs(req, res, next) {
  try {
    const workspaceId = workspace(req);
    const locals = req.app.locals;
    const pool = locals.pool;

    const [
      providerIntelligence,
      agentPlatform,
      workflowRuns,
      workflowDefinitions,
      memoryStats,
      vectorExtension,
      queueState,
      workerState,
      recoveryState,
      deploymentState,
      securityState,
      observabilityState,
      runtimeEvents,
      modelUsage,
      providerValidation,
    ] = await Promise.all([
      capture("providerIntelligence", () => locals.enterpriseCloudService.aiOrchestration({ workspaceId })),
      capture("agentPlatform", () => locals.enterpriseCloudService.agentPlatform({ workspaceId })),
      capture("workflowRuns", () => safeRows(pool, "select status, count(*)::int as count from workflow_runs where workspace_id = $1 group by status", [workspaceId])),
      capture("workflowDefinitions", () => safeRows(pool, "select count(*)::int as count from saved_workflows where workspace_id = $1", [workspaceId])),
      capture("memoryStats", async () => ({
        total: await tableCount(pool, "ai_memories", workspaceId),
        vectorIndexed: (await safeRows(pool, "select count(*)::int as count from ai_memories where workspace_id = $1 and embedding is not null", [workspaceId]))[0]?.count || 0,
        recent: await safeRows(pool, "select id, content, metadata, created_at from ai_memories where workspace_id = $1 order by created_at desc limit 10", [workspaceId]),
      })),
      capture("vectorExtension", () => safeRows(pool, "select extname, extversion from pg_extension where extname = 'vector'")),
      capture("queues", () => locals.workerSupervisorService.queues({ workspaceId })),
      capture("workers", () => locals.workerSupervisorService.workers({ workspaceId })),
      capture("selfHealing", () => locals.runtimeRecoveryService.status({ workspaceId })),
      capture("deployment", () => locals.enterpriseCloudService.deploymentReadiness({ workspaceId })),
      capture("security", () => locals.enterpriseCloudService.securityHardening({ workspaceId })),
      capture("observability", () => locals.enterpriseCloudService.enterpriseObservability({ workspaceId })),
      capture("runtimeEvents", () => safeRows(pool, "select type, count(*)::int as count from realtime_events where workspace_id = $1 and created_at >= now() - interval '24 hours' group by type order by count desc limit 20", [workspaceId])),
      capture("modelUsage", () => safeRows(pool, `select provider, model, task_type, count(*)::int as requests, coalesce(sum(input_tokens + output_tokens),0)::bigint as tokens, coalesce(avg(latency_ms),0)::numeric as avg_latency_ms, coalesce(sum(estimated_cost),0)::numeric as estimated_cost from model_usage_events where workspace_id = $1 and created_at >= now() - interval '30 days' group by provider, model, task_type order by requests desc limit 20`, [workspaceId])),
      capture("providerValidation", () => new ProviderValidationService({
        providerRegistry: locals.providerRegistry,
        providerSettingsService: locals.providerSettingsService || new ProviderSettingsService({ pool }),
        providerHealthService: locals.providerHealthService,
      }).validateAll({ workspaceId, userId: req.user?.id })),
    ]);

    const providers = locals.providerRegistry?.listProviders?.() || [];
    const providerHealth = locals.providerHealthService?.snapshot?.() || {};
    const providerCapabilities = providers.map((provider) => ({
      name: provider.providerName,
      type: provider.providerType,
      capabilities: provider.capabilities || [],
      supportsStreaming: Boolean(provider.supportsStreaming || provider.stream),
      maxTokens: provider.maxTokens || null,
      score: locals.providerHealthService?.scoreProvider?.(provider) || null,
    }));

    const entries = [
      providerIntelligence,
      agentPlatform,
      workflowRuns,
      workflowDefinitions,
      memoryStats,
      vectorExtension,
      queueState,
      workerState,
      recoveryState,
      deploymentState,
      securityState,
      observabilityState,
      runtimeEvents,
      modelUsage,
      providerValidation,
    ];

    const vectorReady = Boolean(vectorExtension.data?.length);
    const blocked = entries
      .filter((entry) => !entry.ok || entry.data?.status === "blocked" || entry.data?.diagnostics?.status === "blocked")
      .map((entry) => ({ name: entry.name, error: entry.error || entry.data?.error || entry.data?.diagnostics?.error || null }));

    return res.status(200).json({
      status: systemStatus(entries),
      timestamp: new Date().toISOString(),
      workspaceId,
      providerIntelligence: {
        ...providerIntelligence,
        capabilities: providerCapabilities,
        metrics: providerHealth.metrics || {},
        healthCache: providerHealth.cache || {},
        validation: providerValidation,
        fallbackChain: providerIntelligence.data?.fallbackChain || ["openai", "anthropic", "gemini", "grok", "deepseek", "ollama"],
      },
      providerValidation,
      agents: {
        ...agentPlatform,
        communicationBus: locals.eventBus?.snapshot?.() || null,
        executionHistory: agentPlatform.data?.runs || [],
      },
      workflows: {
        runs: workflowRuns,
        definitions: workflowDefinitions,
        engine: locals.workflowEngine ? "wired" : "unavailable",
        features: ["drag_drop_builder", "conditional_nodes", "queue_steps", "tool_nodes", "agent_nodes", "execution_replay"],
      },
      memory: {
        status: vectorReady ? "pgvector_ready" : "keyword_fallback",
        provider: "pgvector",
        stats: memoryStats,
        extension: vectorExtension,
        retrieval: locals.enterpriseMemoryService ? "wired" : "unavailable",
      },
      distributedRuntime: {
        queues: queueState,
        workers: workerState,
        deployment: deploymentState,
        recovery: recoveryState,
      },
      observability: {
        runtimeEvents,
        modelUsage,
        enterprise: observabilityState,
        websocket: locals.websocketServer?.metricsSnapshot?.() || null,
        eventBus: locals.eventBus?.snapshot?.() || null,
      },
      security: securityState,
      selfHealing: {
        status: recoveryState.data?.status || "unknown",
        recovery: recoveryState,
        controls: ["queue_recovery", "runtime_failover", "provider_fallback", "guarded_degradation", "recovery_events"],
      },
      blocked,
    });
  } catch (error) {
    return next(error);
  }
}

export async function enterpriseRunProviderBenchmarks(req, res, next) {
  try {
    const result = await req.app.locals.enterpriseCloudService.runProviderBenchmarks({
      workspaceId: workspace(req),
      userId: req.user?.id,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function enterpriseRecommendRoute(req, res, next) {
  try {
    const result = await req.app.locals.enterpriseCloudService.recommendRoute({
      workspaceId: workspace(req),
      taskType: req.body.taskType || req.query.taskType || "reasoning",
      qualityTier: req.body.qualityTier || req.query.qualityTier || "balanced",
      latencyTargetMs: req.body.latencyTargetMs || req.query.latencyTargetMs,
      maxCost: req.body.maxCost || req.query.maxCost,
      requiredCapabilities: req.body.requiredCapabilities || [],
    });
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}
