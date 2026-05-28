export class PerformanceRoutingService {
  constructor({ cacheService, providerHealthService, queueMetricsService }) {
    this.cacheService = cacheService;
    this.providerHealthService = providerHealthService;
    this.queueMetricsService = queueMetricsService;
  }

  async optimizeExecutionPlan(plan) {
    const [providerHealth, queueMetrics] = await Promise.all([
      this.providerHealthService?.snapshot?.(),
      this.queueMetricsService?.snapshot?.(),
    ]);

    return {
      ...plan,
      optimization: {
        cacheEnabled: true,
        parallelizableSteps: this.#parallelizableSteps(plan),
        gpuEligibleSteps: this.#gpuEligibleSteps(plan),
        providerHealth,
        queueMetrics,
        mobileStrategy: {
          lazyPanels: true,
          streamChunks: true,
          virtualizeTimelines: true,
        },
      },
    };
  }

  #parallelizableSteps(plan) {
    return (plan.steps || []).filter((step) => !step.dependsOn || step.dependsOn.length === 0).map((step) => step.id);
  }

  #gpuEligibleSteps(plan) {
    return (plan.steps || []).filter((step) => /(image|video|avatar|music|render)/i.test(`${step.title} ${step.type}`)).map((step) => step.id);
  }
}
