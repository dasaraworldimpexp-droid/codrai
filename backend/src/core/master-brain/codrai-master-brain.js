import { randomUUID } from "node:crypto";
import { BRAIN_INTENTS, BRAIN_ROUTES } from "./master-brain.types.js";

export class CodraiMasterBrain {
  constructor({
    securityOrchestrator,
    knowledgeOrchestrator,
    emotionalIntelligenceEngine,
    autonomousExecutionEngine,
    creationOrchestrator,
    multimodalOrchestrator,
    enterpriseOrchestrator,
    toolExecutionEngine,
    aiRuntimeEngine,
    marketplaceService,
    eventBus,
    auditLogger,
  }) {
    this.securityOrchestrator = securityOrchestrator;
    this.knowledgeOrchestrator = knowledgeOrchestrator;
    this.emotionalIntelligenceEngine = emotionalIntelligenceEngine;
    this.autonomousExecutionEngine = autonomousExecutionEngine;
    this.creationOrchestrator = creationOrchestrator;
    this.multimodalOrchestrator = multimodalOrchestrator;
    this.enterpriseOrchestrator = enterpriseOrchestrator;
    this.toolExecutionEngine = toolExecutionEngine;
    this.aiRuntimeEngine = aiRuntimeEngine;
    this.marketplaceService = marketplaceService;
    this.eventBus = eventBus;
    this.auditLogger = auditLogger;
  }

  async execute(request, actor) {
    const operation = {
      id: request.id || randomUUID(),
      userId: actor?.id || request.userId,
      workspaceId: request.workspaceId,
      projectId: request.projectId,
      intent: request.intent || this.#classifyIntent(request),
      input: request.input,
      createdAt: new Date().toISOString(),
    };

    await this.securityOrchestrator.assertAllowed({ operation, actor });

    const [knowledgeContext, emotionalContext] = await Promise.all([
      this.knowledgeOrchestrator.retrieveContext(operation),
      this.emotionalIntelligenceEngine.analyze({
        text: operation.input?.text || operation.input || "",
        userId: operation.userId,
        workspaceId: operation.workspaceId,
        conversationId: request.conversationId,
      }),
    ]);

    const route = this.#resolveRoute(operation);

    await this.eventBus?.publish?.({
      type: "brain.operation.routed",
      channel: `workspace:${operation.workspaceId}`,
      workspaceId: operation.workspaceId,
      projectId: operation.projectId,
      actorId: operation.userId,
      payload: { operationId: operation.id, intent: operation.intent, route },
    });

    const result = await this.#dispatch({ operation, route, request, actor, knowledgeContext, emotionalContext });

    await this.auditLogger?.record?.({
      workspaceId: operation.workspaceId,
      actorId: operation.userId,
      action: "brain.operation.completed",
      metadata: { operationId: operation.id, intent: operation.intent, route },
    });

    return { operationId: operation.id, route, result };
  }

  capabilities() {
    return {
      intents: Object.values(BRAIN_INTENTS),
      routes: Object.values(BRAIN_ROUTES),
      systems: [
        "human_like_ai_core",
        "autonomous_agent_os",
        "multimodal_ai_engine",
        "universal_builder",
        "enterprise_business_os",
        "realtime_systems",
        "memory_knowledge_system",
        "security_trust_layer",
        "performance_scale_layer",
        "app_store_ecosystem",
      ],
    };
  }

  #dispatch({ operation, route, request, actor, knowledgeContext, emotionalContext }) {
    if (route === BRAIN_ROUTES.CREATION) {
      return this.creationOrchestrator.create({ ...request, userId: operation.userId, workspaceId: operation.workspaceId, knowledgeContext, emotionalContext });
    }
    if (route === BRAIN_ROUTES.MULTIMODAL) {
      return this.multimodalOrchestrator.execute({ ...request, userId: operation.userId, workspaceId: operation.workspaceId, knowledgeContext, emotionalContext });
    }
    if (route === BRAIN_ROUTES.ENTERPRISE) {
      return this.enterpriseOrchestrator.execute({ ...request, userId: operation.userId, workspaceId: operation.workspaceId, knowledgeContext });
    }
    if (route === BRAIN_ROUTES.TOOL) {
      return this.toolExecutionEngine.execute({ ...request, userId: operation.userId, workspaceId: operation.workspaceId }, actor);
    }
    if (route === BRAIN_ROUTES.MARKETPLACE) {
      return this.marketplaceService.handleRequest({ ...request, userId: operation.userId, workspaceId: operation.workspaceId });
    }
    if (route === BRAIN_ROUTES.RUNTIME) {
      return this.aiRuntimeEngine.execute({ ...request, userId: operation.userId, workspaceId: operation.workspaceId, context: knowledgeContext, emotionalContext });
    }
    return this.autonomousExecutionEngine.execute({ ...request, id: operation.id, userId: operation.userId, workspaceId: operation.workspaceId, objective: request.goal || request.input?.text || request.input, knowledgeContext, emotionalContext });
  }

  #resolveRoute(operation) {
    const routeByIntent = {
      [BRAIN_INTENTS.BUILD]: BRAIN_ROUTES.CREATION,
      [BRAIN_INTENTS.GENERATE_MEDIA]: BRAIN_ROUTES.MULTIMODAL,
      [BRAIN_INTENTS.RUN_BUSINESS]: BRAIN_ROUTES.ENTERPRISE,
      [BRAIN_INTENTS.INSTALL_EXTENSION]: BRAIN_ROUTES.MARKETPLACE,
      [BRAIN_INTENTS.CHAT]: BRAIN_ROUTES.RUNTIME,
      [BRAIN_INTENTS.AUTOMATE]: BRAIN_ROUTES.AUTONOMY,
      [BRAIN_INTENTS.ANALYZE]: BRAIN_ROUTES.AUTONOMY,
      [BRAIN_INTENTS.TEACH]: BRAIN_ROUTES.AUTONOMY,
    };

    return routeByIntent[operation.intent] || BRAIN_ROUTES.AUTONOMY;
  }

  #classifyIntent(request) {
    const text = String(request.goal || request.input?.text || request.input || "").toLowerCase();
    if (/(build|create|generate app|website|dashboard|store|saas|game|presentation|document|chatbot)/.test(text)) return BRAIN_INTENTS.BUILD;
    if (/(image|video|voice|avatar|music|audio|cinematic)/.test(text)) return BRAIN_INTENTS.GENERATE_MEDIA;
    if (/(crm|erp|sales|finance|company|business intelligence|analytics)/.test(text)) return BRAIN_INTENTS.RUN_BUSINESS;
    if (/(plugin|extension|marketplace|template)/.test(text)) return BRAIN_INTENTS.INSTALL_EXTENSION;
    if (/(teach|learn|explain|course)/.test(text)) return BRAIN_INTENTS.TEACH;
    if (/(automate|workflow|schedule|integration)/.test(text)) return BRAIN_INTENTS.AUTOMATE;
    return BRAIN_INTENTS.CHAT;
  }
}
