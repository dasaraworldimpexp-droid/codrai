export class PerformanceMonitorService {
  constructor({ metricsRepository }) {
    this.metricsRepository = metricsRepository;
  }

  async record(metric) {
    return this.metricsRepository?.append?.({
      ...metric,
      recordedAt: metric.recordedAt || new Date().toISOString(),
    });
  }

  async healthSnapshot({ workspaceId }) {
    return this.metricsRepository?.snapshot?.({ workspaceId }) || {
      workspaceId,
      latency: { p50: null, p95: null },
      queues: [],
      providers: [],
      cache: { hitRate: null },
    };
  }
}
