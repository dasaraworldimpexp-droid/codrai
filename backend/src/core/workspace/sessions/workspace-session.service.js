export class WorkspaceSessionService {
  constructor({ sessionRepository, eventBus }) {
    this.sessionRepository = sessionRepository;
    this.eventBus = eventBus;
  }

  async getSession({ userId, workspaceId, deviceId }) {
    return this.sessionRepository.getOrCreate({
      userId,
      workspaceId,
      deviceId,
      defaults: {
        tabs: [],
        panels: [],
        activeProjectId: null,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  async patchSession({ userId, workspaceId, deviceId, patch }) {
    const session = await this.sessionRepository.patch({ userId, workspaceId, deviceId, patch });

    await this.eventBus?.publish?.({
      type: "workspace.session.updated",
      channel: `workspace:${workspaceId}`,
      workspaceId,
      actorId: userId,
      payload: { deviceId, patch },
    });

    return session;
  }
}
