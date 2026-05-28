export class ProviderHealthService {
  constructor({ cacheTtlMs = 30000 } = {}) {
    this.cacheTtlMs = cacheTtlMs;
    this.cache = new Map();
    this.metrics = new Map();
  }

  async filterHealthy(providers, task = {}) {
    const checks = await Promise.all(providers.map(async (provider) => ({
      provider,
      healthy: await this.isHealthy(provider, task),
    })));

    return checks.filter((check) => check.healthy).map((check) => check.provider);
  }

  async isHealthy(provider, context = {}) {
    const cached = this.cache.get(`${context.workspaceId || "env"}:${provider.providerName}`);
    if (cached && Date.now() - cached.checkedAt < this.cacheTtlMs) {
      return cached.healthy;
    }

    try {
      const health = await provider.healthCheck(context);
      const healthy = health.status === "ok";
      this.cache.set(`${context.workspaceId || "env"}:${provider.providerName}`, { healthy, checkedAt: Date.now() });
      return healthy;
    } catch {
      this.cache.set(`${context.workspaceId || "env"}:${provider.providerName}`, { healthy: false, checkedAt: Date.now() });
      return false;
    }
  }

  snapshot() {
    return {
      cache: Object.fromEntries([...this.cache.entries()]),
      metrics: Object.fromEntries([...this.metrics.entries()]),
    };
  }

  clear(providerName, workspaceId) {
    if (!providerName) {
      this.cache.clear();
      return;
    }
    this.cache.delete(`${workspaceId || "env"}:${providerName}`);
  }

  recordSuccess({ providerName, latencyMs = 0, streamingInterrupted = false } = {}) {
    if (!providerName) return;
    const current = this.#metric(providerName);
    current.requestCount += 1;
    current.successCount += 1;
    current.totalLatencyMs += latencyMs;
    current.lastLatencyMs = latencyMs;
    current.streamingInterruptions += streamingInterrupted ? 1 : 0;
    current.lastSuccessAt = new Date().toISOString();
    this.metrics.set(providerName, current);
  }

  recordFailure({ providerName, error, retry = false, timeout = false, streamingInterrupted = false } = {}) {
    if (!providerName) return;
    const current = this.#metric(providerName);
    current.requestCount += retry ? 0 : 1;
    current.failureCount += 1;
    current.retryCount += retry ? 1 : 0;
    current.timeoutCount += timeout ? 1 : 0;
    current.streamingInterruptions += streamingInterrupted ? 1 : 0;
    current.lastError = error?.message || String(error || "provider failure");
    current.lastFailureAt = new Date().toISOString();
    this.metrics.set(providerName, current);
  }

  scoreProvider(provider) {
    const metric = this.#metric(provider.providerName);
    const successRate = metric.requestCount > 0 ? metric.successCount / metric.requestCount : 0.5;
    const avgLatency = metric.successCount > 0 ? metric.totalLatencyMs / metric.successCount : provider.estimatedLatencyMs || 1500;
    const timeoutPenalty = Math.min(metric.timeoutCount * 12, 36);
    const failurePenalty = Math.min(metric.failureCount * 8, 40);
    const latencyPenalty = Math.min(avgLatency / 200, 25);
    const streamingBonus = provider.supportsStreaming ? 8 : 0;
    const score = Math.max(0, Math.min(100, 60 + successRate * 30 + streamingBonus - timeoutPenalty - failurePenalty - latencyPenalty));
    return {
      provider: provider.providerName,
      score: Number(score.toFixed(2)),
      requestCount: metric.requestCount,
      successRate: Number(successRate.toFixed(3)),
      avgLatencyMs: Number(avgLatency.toFixed(1)),
      failures: metric.failureCount,
      retries: metric.retryCount,
      timeouts: metric.timeoutCount,
      supportsStreaming: Boolean(provider.supportsStreaming),
    };
  }

  rankProviders(providers) {
    return [...providers].sort((a, b) => this.scoreProvider(b).score - this.scoreProvider(a).score);
  }

  #metric(providerName) {
    return this.metrics.get(providerName) || {
      requestCount: 0,
      successCount: 0,
      failureCount: 0,
      retryCount: 0,
      timeoutCount: 0,
      streamingInterruptions: 0,
      totalLatencyMs: 0,
      lastLatencyMs: null,
      lastError: null,
      lastSuccessAt: null,
      lastFailureAt: null,
    };
  }
}
