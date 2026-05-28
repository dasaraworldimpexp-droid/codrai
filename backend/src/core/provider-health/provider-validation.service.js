export class ProviderValidationService {
  constructor({ providerRegistry, providerSettingsService, providerHealthService } = {}) {
    this.providerRegistry = providerRegistry;
    this.providerSettingsService = providerSettingsService;
    this.providerHealthService = providerHealthService;
  }

  async validateAll(context = {}) {
    const providers = this.providerRegistry.listProviders?.() || [];
    const startedAt = Date.now();

    const checks = await Promise.all(providers.map(async (provider) => {
      const providerStartedAt = Date.now();
      try {
        const health = await provider.healthCheck(context);
        await this.providerSettingsService?.updateProviderHealth?.({
          workspaceId: context.workspaceId,
          providerName: provider.providerName,
          status: "active",
        });
        return {
          provider: provider.providerName,
          status: "ok",
          configured: true,
          latencyMs: Date.now() - providerStartedAt,
          capabilities: provider.capabilities || [],
          supportsStreaming: Boolean(provider.supportsStreaming),
          maxTokens: provider.maxTokens || null,
          score: this.providerHealthService?.scoreProvider?.(provider),
          health,
        };
      } catch (error) {
        const status = error.name === "ProviderConfigurationError" || error.message?.includes("not configured") ? "missing" : "error";
        await this.providerSettingsService?.updateProviderHealth?.({
          workspaceId: context.workspaceId,
          providerName: provider.providerName,
          status,
          error: error.message,
        });
        return {
          provider: provider.providerName,
          status,
          configured: status !== "missing",
          latencyMs: Date.now() - providerStartedAt,
          capabilities: provider.capabilities || [],
          supportsStreaming: Boolean(provider.supportsStreaming),
          maxTokens: provider.maxTokens || null,
          score: this.providerHealthService?.scoreProvider?.(provider),
          error: error.message,
        };
      }
    }));

    return {
      status: checks.some((check) => check.status === "ok") ? "partial" : "unavailable",
      totalLatencyMs: Date.now() - startedAt,
      checks,
    };
  }
}
