export class KnowledgeOrchestrator {
  constructor({ memoryOrchestrator, knowledgeGraphService, vectorDatabase, policyService }) {
    this.memoryOrchestrator = memoryOrchestrator;
    this.knowledgeGraphService = knowledgeGraphService;
    this.vectorDatabase = vectorDatabase;
    this.policyService = policyService;
  }

  async retrieveContext(operation) {
    await this.policyService?.assertMemoryAccess?.(operation);

    const [memoryContext, graphContext] = await Promise.all([
      this.memoryOrchestrator?.retrieveForAutonomousGoal?.({
        userId: operation.userId,
        workspaceId: operation.workspaceId,
        projectId: operation.projectId,
        objective: operation.input?.text || operation.input,
      }),
      this.knowledgeGraphService?.neighborhood?.({
        workspaceId: operation.workspaceId,
        entity: operation.projectId || operation.userId,
      }),
    ]);

    return {
      memory: memoryContext,
      graph: graphContext,
      isolation: {
        workspaceId: operation.workspaceId,
        projectId: operation.projectId,
      },
    };
  }
}
