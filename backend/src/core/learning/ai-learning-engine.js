export class AiLearningEngine {
  constructor({ analyticsService, memoryOrchestrator, routingOptimizer, promptOptimizer }) {
    this.analyticsService = analyticsService;
    this.memoryOrchestrator = memoryOrchestrator;
    this.routingOptimizer = routingOptimizer;
    this.promptOptimizer = promptOptimizer;
  }

  async learnFromExecution({ workspaceId, projectId, execution, feedback }) {
    await this.analyticsService.recordExecution({ workspaceId, projectId, execution, feedback });

    const [routingRecommendation, promptRecommendation] = await Promise.all([
      this.routingOptimizer?.recommend?.({ workspaceId, execution, feedback }),
      this.promptOptimizer?.recommend?.({ workspaceId, execution, feedback }),
    ]);

    await this.memoryOrchestrator?.captureOutcome?.({
      goal: { workspaceId, projectId, id: execution.id, objective: execution.intent },
      plan: { riskLevel: execution.riskLevel, requiredAgents: execution.agents || [] },
      result: execution.result,
    });

    return { routingRecommendation, promptRecommendation };
  }
}
