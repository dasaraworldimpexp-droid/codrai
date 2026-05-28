export class AgentPerformanceScorer {
  constructor({ scoringRepository } = {}) {
    this.scoringRepository = scoringRepository;
  }

  async scoreRun({ run, plan, result, metrics = {} }) {
    const score = {
      runId: run.id,
      workspaceId: run.workspaceId,
      projectId: run.projectId,
      completionScore: result?.status === "completed" || result?.status === "completed_with_notes" ? 1 : 0,
      retryPenalty: Math.min((metrics.retryCount || 0) * 0.1, 0.4),
      latencyScore: this.#latencyScore(metrics.latencyMs),
      costScore: this.#costScore(metrics.cost),
      userFeedbackScore: metrics.userFeedbackScore ?? null,
      agentCoverage: plan?.requiredAgents?.length || 0,
      createdAt: new Date().toISOString(),
    };

    score.overall = Math.max(
      0,
      Math.min(1, (score.completionScore * 0.45) + (score.latencyScore * 0.2) + (score.costScore * 0.15) - score.retryPenalty + ((score.userFeedbackScore ?? 0.5) * 0.2))
    );

    await this.scoringRepository?.save?.(score);
    return score;
  }

  #latencyScore(latencyMs = 0) {
    if (!latencyMs) return 0.7;
    if (latencyMs < 1000) return 1;
    if (latencyMs < 5000) return 0.8;
    if (latencyMs < 15000) return 0.55;
    return 0.3;
  }

  #costScore(cost = 0) {
    if (!cost) return 0.8;
    if (cost < 0.02) return 1;
    if (cost < 0.25) return 0.75;
    return 0.45;
  }
}
