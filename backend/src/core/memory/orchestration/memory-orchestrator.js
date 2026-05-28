export class MemoryOrchestrator {
  constructor({
    memoryRetrievalRuntime,
    shortTermMemory,
    longTermMemory,
    conversationMemory,
    projectMemory,
    memoryCompressor,
    memoryRepository,
  }) {
    this.memoryRetrievalRuntime = memoryRetrievalRuntime;
    this.shortTermMemory = shortTermMemory;
    this.longTermMemory = longTermMemory;
    this.conversationMemory = conversationMemory;
    this.projectMemory = projectMemory;
    this.memoryCompressor = memoryCompressor;
    this.memoryRepository = memoryRepository;
  }

  async retrieveForAutonomousGoal(goal) {
    const [semantic, shortTerm, longTerm, conversation, project] = await Promise.all([
      this.memoryRetrievalRuntime.retrieve({
        userId: goal.userId,
        workspaceId: goal.workspaceId,
        projectId: goal.projectId,
        conversationId: goal.conversationId,
        intent: goal.objective,
        input: { text: goal.objective },
      }),
      this.shortTermMemory?.getActiveContext?.(goal),
      this.longTermMemory?.getUserWorkspaceMemory?.(goal.userId, goal.workspaceId),
      this.conversationMemory?.getSummary?.(goal.conversationId),
      this.projectMemory?.getProjectState?.(goal.projectId),
    ]);

    return this.memoryCompressor.compress({
      objective: goal.objective,
      blocks: [
        { type: "semantic", content: semantic },
        { type: "short_term", content: shortTerm },
        { type: "long_term", content: longTerm },
        { type: "conversation", content: conversation },
        { type: "project", content: project },
      ].filter((block) => block.content),
    });
  }

  async captureOutcome({ goal, plan, result, emotionalContext }) {
    return this.memoryRepository?.appendRunMemory?.({
      userId: goal.userId,
      workspaceId: goal.workspaceId,
      projectId: goal.projectId,
      sourceType: "autonomous_agent_run",
      sourceId: goal.id,
      content: {
        objective: goal.objective,
        planSummary: {
          riskLevel: plan.riskLevel,
          requiredAgents: plan.requiredAgents,
          successCriteria: plan.successCriteria,
        },
        result,
        emotionalContext: emotionalContext?.persistable === true ? emotionalContext : undefined,
      },
      createdAt: new Date().toISOString(),
    });
  }
}
