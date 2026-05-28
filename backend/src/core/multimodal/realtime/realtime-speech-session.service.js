export class RealtimeSpeechSessionService {
  constructor({ eventBus, aiRuntimeEngine, sessionRepository }) {
    this.eventBus = eventBus;
    this.aiRuntimeEngine = aiRuntimeEngine;
    this.sessionRepository = sessionRepository;
  }

  async startSession({ workspaceId, userId, voiceProfileId, conversationId }) {
    const session = await this.sessionRepository.create({
      workspaceId,
      userId,
      voiceProfileId,
      conversationId,
      status: "active",
      startedAt: new Date().toISOString(),
    });

    await this.eventBus.publish({
      type: "speech.session.started",
      channel: `conversation:${conversationId || session.id}`,
      workspaceId,
      actorId: userId,
      payload: { sessionId: session.id },
    });

    return session;
  }

  async interrupt({ workspaceId, sessionId, reason }) {
    await this.sessionRepository.updateStatus(sessionId, "interrupted", { reason });
    await this.eventBus.publish({
      type: "speech.session.interrupted",
      channel: `speech:${sessionId}`,
      workspaceId,
      payload: { sessionId, reason },
    });
    return { sessionId, status: "interrupted" };
  }
}
