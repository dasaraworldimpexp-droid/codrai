export class AutonomousExecutionLoop {
  constructor({ priorityEngine, multiAgentRuntime, selfHealingEngine, eventBus, runRepository }) {
    this.priorityEngine = priorityEngine;
    this.multiAgentRuntime = multiAgentRuntime;
    this.selfHealingEngine = selfHealingEngine;
    this.eventBus = eventBus;
    this.runRepository = runRepository;
  }

  async run({ objective, tasks, workspaceId, projectId, userId }) {
    const ordered = this.priorityEngine.order(tasks);
    const results = [];

    for (const { task, priority } of ordered) {
      await this.eventBus?.publish?.({
        type: "autonomy.task.started",
        channel: `workspace:${workspaceId}`,
        workspaceId,
        projectId,
        actorId: userId,
        payload: { taskId: task.id, priority },
      });

      try {
        const result = await this.multiAgentRuntime.run({ userId, workspaceId, projectId, objective: task.objective || objective, plan: task.plan });
        results.push({ taskId: task.id, result });
      } catch (error) {
        const recoveryPlan = this.selfHealingEngine.createRecoveryPlan({ failedStep: task, error, run: { id: task.runId || task.id } });
        await this.runRepository?.appendRecoveryPlan?.({ workspaceId, projectId, taskId: task.id, recoveryPlan });
        results.push({ taskId: task.id, error: error.message, recoveryPlan });
      }
    }

    return { objective, results, completedAt: new Date().toISOString() };
  }
}
