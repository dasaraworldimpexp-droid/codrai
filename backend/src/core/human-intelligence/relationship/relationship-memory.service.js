export class RelationshipMemoryService {
  constructor({ memoryRepository }) {
    this.memoryRepository = memoryRepository;
  }

  async timeline({ userId, workspaceId, limit = 20 }) {
    return this.memoryRepository?.findRelationshipEvents?.({ userId, workspaceId, limit }) || [];
  }

  async rememberInteraction({ userId, workspaceId, conversationId, emotionalState, preferences, summary }) {
    return this.memoryRepository?.appendRelationshipEvent?.({
      userId,
      workspaceId,
      conversationId,
      emotionalState,
      preferences,
      summary,
      createdAt: new Date().toISOString(),
    });
  }
}
