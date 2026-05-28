export class AiContextEngine {
  constructor({
    memoryRetrievalRuntime,
    projectRepository,
    conversationRepository,
    personalizationService,
    assetRepository,
    contextCompressor,
  }) {
    this.memoryRetrievalRuntime = memoryRetrievalRuntime;
    this.projectRepository = projectRepository;
    this.conversationRepository = conversationRepository;
    this.personalizationService = personalizationService;
    this.assetRepository = assetRepository;
    this.contextCompressor = contextCompressor;
  }

  async buildContext(task) {
    const [memory, project, conversation, personalization, assets] = await Promise.all([
      this.memoryRetrievalRuntime.retrieve(task),
      task.projectId ? this.projectRepository?.getRuntimeContext?.(task.projectId) : null,
      task.conversationId ? this.conversationRepository?.getRuntimeSummary?.(task.conversationId) : null,
      this.personalizationService?.getRuntimeProfile?.(task.userId, task.workspaceId),
      this.assetRepository?.getManifestForTask?.(task),
    ]);

    const blocks = [
      this.#block("retrieved_memory", memory),
      this.#block("project_memory", project),
      this.#block("conversation_summary", conversation),
      this.#block("personalization", personalization),
      this.#block("asset_manifest", assets),
      this.#block("workflow_state", task.workflowState),
      this.#block("agent_journal", task.agentJournal),
    ].filter((block) => block.content);

    return this.contextCompressor?.compress?.({ task, blocks }) || { blocks };
  }

  #block(type, content) {
    return {
      type,
      content,
      createdAt: new Date().toISOString(),
    };
  }
}
