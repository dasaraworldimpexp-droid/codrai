import { ProviderValidationService } from "../core/provider-health/provider-validation.service.js";
import { ProviderSettingsService } from "../services/provider-settings.service.js";

function workspaceId(req) {
  return req.workspace?.id || req.body.workspaceId || req.query.workspaceId;
}

export async function validateProviders(req, res, next) {
  try {
    const providerRegistry = req.app.locals.providerRegistry;
    if (!providerRegistry) {
      return res.status(503).json({ message: "Provider registry is not configured." });
    }

    const providerSettingsService = req.app.locals.providerSettingsService || new ProviderSettingsService({ pool: req.app.locals.pool });
    const validation = await new ProviderValidationService({
      providerRegistry,
      providerSettingsService,
      providerHealthService: req.app.locals.providerHealthService,
    }).validateAll({
      workspaceId: workspaceId(req),
      userId: req.user?.id || req.body.userId,
    });
    return res.status(200).json(validation);
  } catch (error) {
    return next(error);
  }
}

export function listProviders(req, res) {
  const providerRegistry = req.app.locals.providerRegistry;
  if (!providerRegistry) {
    return res.status(503).json({ message: "Provider registry is not configured." });
  }

  return res.status(200).json({
    providers: providerRegistry.listProviders().map((provider) => ({
      name: provider.providerName,
      type: provider.providerType,
      capabilities: provider.capabilities || [],
      qualityTiers: provider.qualityTiers || [],
      supportsStreaming: Boolean(provider.supportsStreaming),
      maxTokens: provider.maxTokens || null,
    })),
  });
}

export async function providerOrchestration(req, res, next) {
  try {
    const registry = req.app.locals.providerRegistry;
    const health = req.app.locals.providerHealthService;
    if (!registry || !health) return res.status(503).json({ message: "Provider orchestration services are not configured." });
    const providers = registry.listProviders();
    const validation = await new ProviderValidationService({
      providerRegistry: registry,
      providerSettingsService: req.app.locals.providerSettingsService,
      providerHealthService: health,
    }).validateAll({
      workspaceId: workspaceId(req),
      userId: req.user?.id || req.query.userId,
    });
    const scores = providers.map((provider) => ({
      ...health.scoreProvider(provider),
      type: provider.providerType,
      capabilities: provider.capabilities || [],
      qualityTiers: provider.qualityTiers || [],
      maxTokens: provider.maxTokens || null,
    })).sort((a, b) => b.score - a.score);
    return res.status(200).json({
      status: "ready",
      workspaceId: workspaceId(req),
      generatedAt: new Date().toISOString(),
      gateway: {
        retryPolicy: {
          maxAttempts: Number(process.env.PROVIDER_MAX_ATTEMPTS || 2),
          baseDelayMs: Number(process.env.PROVIDER_RETRY_BASE_DELAY_MS || 500),
          timeoutMs: Number(process.env.PROVIDER_TIMEOUT_MS || 120000),
        },
        localFirst: process.env.CODRAI_LOCAL_FIRST === "true",
        localRouting: process.env.CODRAI_LOCAL_ROUTING === "true",
        fallback: "ranked_provider_chain",
      },
      validation,
      scores,
      metrics: health.snapshot().metrics,
    });
  } catch (error) {
    return next(error);
  }
}

export async function providerHealthDashboard(req, res, next) {
  try {
    const registry = req.app.locals.providerRegistry;
    const health = req.app.locals.providerHealthService;
    if (!registry || !health) return res.status(503).json({ message: "Provider health services are not configured." });

    const workspace = workspaceId(req);
    const validation = await new ProviderValidationService({
      providerRegistry: registry,
      providerSettingsService: req.app.locals.providerSettingsService,
      providerHealthService: health,
    }).validateAll({
      workspaceId: workspace,
      userId: req.user?.id || req.query.userId,
    });
    const providers = registry.listProviders();
    const scores = providers.map((provider) => ({
      ...health.scoreProvider(provider),
      type: provider.providerType,
      capabilities: provider.capabilities || [],
      qualityTiers: provider.qualityTiers || [],
      maxTokens: provider.maxTokens || null,
    })).sort((a, b) => b.score - a.score);
    const checksByProvider = new Map((validation.checks || []).map((check) => [check.provider, check]));
    const priorityChain = scores.map((score) => ({
      provider: score.provider,
      score: score.score,
      status: checksByProvider.get(score.provider)?.status || "unknown",
      configured: Boolean(checksByProvider.get(score.provider)?.configured),
      latencyMs: checksByProvider.get(score.provider)?.latencyMs || score.avgLatencyMs,
      failoverEligible: checksByProvider.get(score.provider)?.status === "ok",
      lastError: checksByProvider.get(score.provider)?.error || null,
    }));

    return res.status(200).json({
      status: validation.status,
      workspaceId: workspace,
      generatedAt: new Date().toISOString(),
      providerCount: providers.length,
      activeProviders: priorityChain.filter((provider) => provider.status === "ok").length,
      priorityChain,
      validation,
      metrics: health.snapshot().metrics,
      policy: {
        localFirst: process.env.CODRAI_LOCAL_FIRST === "true",
        localRouting: process.env.CODRAI_LOCAL_ROUTING === "true",
        maxAttempts: Number(process.env.PROVIDER_MAX_ATTEMPTS || 2),
        timeoutMs: Number(process.env.PROVIDER_TIMEOUT_MS || 120000),
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function liveProviderExecution(req, res, next) {
  try {
    const runtimeEngine = req.app.locals.runtimeEngine;
    if (!runtimeEngine) return res.status(503).json({ message: "AI runtime engine is not configured." });
    const result = await runtimeEngine.execute({
      workspaceId: workspaceId(req) || "local-workspace",
      userId: req.user?.id || req.body.userId,
      taskType: req.body.taskType || "reasoning",
      qualityTier: req.body.qualityTier || "balanced",
      providerPreference: req.body.providerPreference || "auto",
      requiredCapabilities: req.body.requiredCapabilities || [],
      input: {
        text: req.body.prompt || req.body.text || "Respond with a concise CODRAI live provider execution readiness message.",
        images: req.body.images || [],
        files: req.body.files || [],
      },
      intent: req.body.prompt || req.body.text || "Verify CODRAI live provider execution.",
      model: req.body.model,
      temperature: req.body.temperature,
    }, {
      executionMode: req.body.stream ? "stream" : req.body.executionMode,
    });
    return res.status(202).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function listProviderSettings(req, res, next) {
  try {
    const service = req.app.locals.providerSettingsService || new ProviderSettingsService({ pool: req.app.locals.pool });
    const registry = req.app.locals.providerRegistry;
    const providersByName = new Map((registry?.listProviders?.() || []).map((provider) => [provider.providerName, provider]));
    const settings = (await service.listSettings({ workspaceId: workspaceId(req) })).map((setting) => {
      const runtimeProvider = providersByName.get(setting.name);
      return {
        ...setting,
        supportsStreaming: Boolean(runtimeProvider?.supportsStreaming),
        maxTokens: runtimeProvider?.maxTokens || null,
      };
    });
    return res.status(200).json({ providers: settings });
  } catch (error) {
    return next(error);
  }
}

export async function saveProviderSetting(req, res, next) {
  try {
    const service = req.app.locals.providerSettingsService || new ProviderSettingsService({ pool: req.app.locals.pool });
    const result = await service.saveProviderKey({
      workspaceId: workspaceId(req),
      userId: req.user?.id || req.body.userId,
      providerName: req.params.providerName,
      apiKey: req.body.apiKey,
    });
    req.app.locals.providerHealthService?.clear?.(result.provider, workspaceId(req));
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function deleteProviderSetting(req, res, next) {
  try {
    const service = req.app.locals.providerSettingsService || new ProviderSettingsService({ pool: req.app.locals.pool });
    const result = await service.removeProviderKey({
      workspaceId: workspaceId(req),
      userId: req.user?.id || req.body.userId,
      providerName: req.params.providerName,
    });
    req.app.locals.providerHealthService?.clear?.(result.provider, workspaceId(req));
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}
