export class SecurityOrchestrator {
  constructor({ rbacService, abuseProtectionService, auditLogger }) {
    this.rbacService = rbacService;
    this.abuseProtectionService = abuseProtectionService;
    this.auditLogger = auditLogger;
  }

  async assertAllowed({ operation, actor }) {
    await this.rbacService?.assertPermission?.({
      userId: operation.userId,
      workspaceId: operation.workspaceId,
      permission: this.#permissionForIntent(operation.intent),
    });

    await this.abuseProtectionService?.assertAllowed?.({
      key: `${operation.workspaceId}:${operation.userId}:${operation.intent}`,
      limit: 120,
      windowMs: 60_000,
      metadata: { operationId: operation.id, actorId: actor?.id },
    });

    await this.auditLogger?.record?.({
      workspaceId: operation.workspaceId,
      actorId: operation.userId,
      action: "security.operation_allowed",
      metadata: { operationId: operation.id, intent: operation.intent },
    });

    return true;
  }

  #permissionForIntent(intent) {
    return `brain:${intent}`;
  }
}
