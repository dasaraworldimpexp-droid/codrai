export class UsageEstimatorService {
  async rankByCostLatency({ candidates, task, maxCost, latencyTargetMs }) {
    const estimates = await Promise.all(candidates.map(async (provider) => {
      const estimate = await provider.estimateCost(task);
      return { provider, estimate, score: this.#score({ estimate, maxCost, latencyTargetMs }) };
    }));

    return estimates
      .filter(({ estimate }) => maxCost === undefined || estimate.estimatedCost <= maxCost)
      .sort((a, b) => b.score - a.score)
      .map(({ provider }) => provider);
  }

  #score({ estimate, latencyTargetMs }) {
    const costScore = estimate.estimatedCost ? 1 / Math.max(estimate.estimatedCost, 0.0001) : 1;
    const latencyScore = latencyTargetMs && estimate.estimatedLatencyMs
      ? Math.min(1, latencyTargetMs / estimate.estimatedLatencyMs)
      : 0.75;
    return costScore * 0.35 + latencyScore * 0.65;
  }
}
