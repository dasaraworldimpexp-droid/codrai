export class EnterpriseOrchestrator {
  constructor({ moduleRegistry, autonomousExecutionEngine, eventBus, auditLogger }) {
    this.moduleRegistry = moduleRegistry;
    this.autonomousExecutionEngine = autonomousExecutionEngine;
    this.eventBus = eventBus;
    this.auditLogger = auditLogger;
  }

  async execute(request) {
    const moduleName = request.moduleName || this.#inferModule(request);
    const module = this.moduleRegistry.get(moduleName);

    await this.eventBus?.publish?.({
      type: "enterprise.action.started",
      channel: `workspace:${request.workspaceId}`,
      workspaceId: request.workspaceId,
      projectId: request.projectId,
      actorId: request.userId,
      payload: { moduleName, goal: request.goal },
    });

    const result = await module.execute({
      ...request,
      autonomousExecutionEngine: this.autonomousExecutionEngine,
    });

    await this.auditLogger?.record?.({
      workspaceId: request.workspaceId,
      actorId: request.userId,
      action: "enterprise.action.completed",
      metadata: { moduleName },
    });

    return { moduleName, result };
  }

  #inferModule(request) {
    const text = String(request.goal || request.input?.text || "").toLowerCase();
    if (/crm|lead|pipeline|customer/.test(text)) return "crm";
    if (/invoice|finance|cash|revenue|expense/.test(text)) return "finance";
    if (/analytics|bi|dashboard|metrics/.test(text)) return "business_intelligence";
    if (/team|collaboration|company|okr|management/.test(text)) return "company_management";
    if (/marketing|campaign|social/.test(text)) return "marketing_automation";
    if (/sales|funnel|outreach/.test(text)) return "sales_automation";
    return "erp";
  }
}
