export class MemoryRetrievalRuntime {
  constructor({ memoryRepository, vectorIndex, embeddingProvider, policyService, reranker }) {
    this.memoryRepository = memoryRepository;
    this.vectorIndex = vectorIndex;
    this.embeddingProvider = embeddingProvider;
    this.policyService = policyService;
    this.reranker = reranker;
  }

  async retrieve(task) {
    const policy = await this.policyService.resolveMemoryPolicy(task);

    if (policy.disabled) {
      return { memories: [], policy };
    }

    const embedding = await this.embeddingProvider.embed({
      input: [task.intent, task.input?.text].filter(Boolean).join("\n"),
      workspaceId: task.workspaceId,
      userId: task.userId,
    });

    const candidates = await this.vectorIndex.search({
      embedding,
      workspaceId: task.workspaceId,
      userId: task.userId,
      projectId: task.projectId,
      scopes: policy.scopes,
      limit: policy.candidateLimit || 24,
    });

    const canonicalMemories = await this.memoryRepository.findByIds(
      candidates.map((candidate) => candidate.memoryId)
    );

    const permitted = await this.policyService.filterPermittedMemories({
      task,
      memories: canonicalMemories,
    });

    const ranked = await this.reranker.rank({
      task,
      memories: permitted,
      vectorMatches: candidates,
    });

    return {
      memories: ranked.slice(0, policy.maxMemories || 8),
      policy,
    };
  }
}
