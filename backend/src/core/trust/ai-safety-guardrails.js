export class AiSafetyGuardrails {
  constructor({ moderationService, auditLogger }) {
    this.moderationService = moderationService;
    this.auditLogger = auditLogger;
  }

  async evaluate({ workspaceId, userId, input, action }) {
    const moderation = await this.moderationService?.check?.({ text: input, workspaceId });
    const blocked = moderation?.blocked === true;

    if (blocked) {
      await this.auditLogger?.record?.({
        workspaceId,
        actorId: userId,
        action: "safety.blocked",
        metadata: { requestedAction: action, moderation },
      });
    }

    return {
      allowed: !blocked,
      moderation,
      action,
      evaluatedAt: new Date().toISOString(),
    };
  }
}
