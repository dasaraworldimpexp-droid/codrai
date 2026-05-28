export class KnowledgeGraphService {
  constructor({ graphRepository }) {
    this.graphRepository = graphRepository;
  }

  async upsertFact({ workspaceId, subject, predicate, object, source, confidence = 0.7 }) {
    return this.graphRepository.upsertEdge({
      workspaceId,
      subject,
      predicate,
      object,
      source,
      confidence,
      updatedAt: new Date().toISOString(),
    });
  }

  async neighborhood({ workspaceId, entity, depth = 2 }) {
    return this.graphRepository.neighborhood({ workspaceId, entity, depth });
  }
}
