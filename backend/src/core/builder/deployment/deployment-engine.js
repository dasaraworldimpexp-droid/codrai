export class DeploymentEngine {
  constructor({ deploymentRepository, toolExecutionEngine, eventBus }) {
    this.deploymentRepository = deploymentRepository;
    this.toolExecutionEngine = toolExecutionEngine;
    this.eventBus = eventBus;
  }

  async planDeployment({ workspaceId, projectId, userId, target, buildArtifactId }) {
    return this.deploymentRepository.createPlan({
      workspaceId,
      projectId,
      userId,
      target,
      buildArtifactId,
      status: "approval_required",
      createdAt: new Date().toISOString(),
    });
  }

  async executeDeployment(plan, actor) {
    const result = await this.toolExecutionEngine.execute({
      workspaceId: plan.workspaceId,
      projectId: plan.projectId,
      toolName: "deployment.execute",
      input: plan,
      riskLevel: "high",
      maxAutonomousRisk: "medium",
    }, actor);

    await this.eventBus.publish({
      type: "deployment.execution.started",
      channel: `project:${plan.projectId}`,
      workspaceId: plan.workspaceId,
      projectId: plan.projectId,
      actorId: actor?.id,
      payload: { deploymentPlanId: plan.id, executionId: result.id },
    });

    return result;
  }
}
