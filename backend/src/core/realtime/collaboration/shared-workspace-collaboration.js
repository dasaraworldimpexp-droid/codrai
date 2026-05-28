export class SharedWorkspaceCollaboration {
  constructor({ eventBus, collaborationRepository }) {
    this.eventBus = eventBus;
    this.collaborationRepository = collaborationRepository;
  }

  async applyPatch({ workspaceId, projectId, documentId, userId, patch, version }) {
    const result = await this.collaborationRepository.applyPatch({
      workspaceId,
      projectId,
      documentId,
      userId,
      patch,
      version,
      updatedAt: new Date().toISOString(),
    });

    await this.eventBus.publish({
      type: "collaboration.patch.applied",
      channel: `project:${projectId}`,
      workspaceId,
      projectId,
      actorId: userId,
      payload: { documentId, patch, version: result.version },
    });

    return result;
  }

  async presence({ workspaceId, projectId, userId, state }) {
    await this.eventBus.publish({
      type: "collaboration.presence",
      channel: `project:${projectId}`,
      workspaceId,
      projectId,
      actorId: userId,
      payload: { userId, state, at: new Date().toISOString() },
    });
  }
}
