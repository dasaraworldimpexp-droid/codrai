import { BackgroundProcessor } from "../core/background-processing/background-processor.js";
import { AiContextEngine } from "../core/context/ai-context-engine.js";
import { AiEmployeeService } from "../core/employees/ai-employee.service.js";
import { RealtimeEventBus } from "../core/events/realtime-event-bus.js";
import { AgiFederationService } from "../core/federation/agi-federation.service.js";
import { ModelRoutingAnalyticsService } from "../core/analytics/model-routing-analytics.service.js";
import { SelfHealingService } from "../core/healing/self-healing.service.js";
import { SelfImprovementEngine } from "../core/learning/self-improvement-engine.js";
import { SuperintelligenceMeshService } from "../core/superintelligence/superintelligence-mesh.service.js";
import { AutonomousCycleService } from "../core/autonomy/autonomous-cycle.service.js";
import { CivilizationRuntimeService } from "../core/civilization/civilization-runtime.service.js";
import { CivilizationNetworkService } from "../core/civilization/civilization-network.service.js";
import { CloudDeploymentService } from "../core/deployment/cloud-deployment.service.js";
import { EmbeddingRuntimeService } from "../core/embeddings/embedding-runtime.service.js";
import { CosmosIntelligenceService } from "../core/cosmos/cosmos-intelligence.service.js";
import { EnterpriseMemoryService } from "../core/memory/enterprise-memory.service.js";
import { ModelRouterService } from "../core/model-router/model-router.service.js";
import { ProviderHealthService } from "../core/provider-health/provider-health.service.js";
import { ProviderSettingsService } from "../services/provider-settings.service.js";
import { DeveloperApiKeyService } from "../services/developer-api-key.service.js";
import { EnterpriseCloudService } from "../services/enterprise-cloud.service.js";
import { AiStudioService } from "../services/ai-studio.service.js";
import { ProductionIntelligenceService } from "../core/production/production-intelligence.service.js";
import { GlobalExecutionGridService } from "../core/grid/global-execution-grid.service.js";
import { ContainerRuntimeService } from "../core/infrastructure/container-runtime.service.js";
import { CpuRuntimeService } from "../core/infrastructure/cpu-runtime.service.js";
import { GpuCapabilityService } from "../core/infrastructure/gpu-capability.service.js";
import { InfrastructureActivationService } from "../core/infrastructure/infrastructure-activation.service.js";
import { RuntimeRecoveryService } from "../core/infrastructure/runtime-recovery.service.js";
import { WorkerSupervisorService } from "../core/infrastructure/worker-supervisor.service.js";
import { QuantumIntelligenceService } from "../core/quantum/quantum-intelligence.service.js";
import { AiProviderRuntime } from "../core/provider-runtime/ai-provider-runtime.js";
import { BullMqQueueAdapter } from "../core/queues/bullmq-adapter.js";
import { MissingQueueAdapter } from "../core/queues/missing-queue-adapter.js";
import { AiRuntimeEngine } from "../core/runtime/ai-runtime-engine.js";
import { StreamingResponseEngine } from "../core/streaming/streaming-response-engine.js";
import { UsageEstimatorService } from "../core/usage/usage-estimator.service.js";
import { UsageLedgerService } from "../core/usage/usage-ledger.service.js";
import { ToolExecutionEngine } from "../core/tools/tool-execution-engine.js";
import { DynamicToolService } from "../core/tools/dynamic-tool.service.js";
import { WorkflowEngine } from "../core/workflows/workflow-engine.js";
import { ToolRegistry } from "../core/tools/tool-registry.js";
import { ToolPermissionService } from "../core/tools/permissions/tool-permission.service.js";
import { SandboxPolicy } from "../core/tools/sandbox/sandbox-policy.js";
import { registerDefaultTools } from "../core/tools/default-tools.js";
import { BrowserAutomationService } from "../core/tools/browser-automation.service.js";
import { ComputerUseService } from "../core/tools/computer-use.service.js";
import { AppProjectGeneratorService } from "../core/builder/app-project-generator.service.js";
import { AppFactoryService } from "../core/builder/app-factory.service.js";
import { ChunkingService } from "../core/files/chunking.service.js";
import { RealtimeKnowledgeService } from "../core/knowledge/realtime-knowledge.service.js";
import { InternetExecutionService } from "../core/internet/internet-execution.service.js";
import { MarketplaceService } from "../core/marketplace/marketplace.service.js";
import { MetaIntelligenceService } from "../core/meta-intelligence/meta-intelligence.service.js";
import { MissionControlService } from "../core/missions/mission-control.service.js";
import { RuntimeTelemetryService } from "../core/observability/runtime-telemetry.service.js";
import { InfrastructureSupervisorService } from "../core/observability/infrastructure-supervisor.service.js";
import { PlanetaryIntelligenceService } from "../core/planetary/planetary-intelligence.service.js";
import { DistributedExecutionService } from "../core/runtime/distributed-execution.service.js";
import { DistributedRuntimeService } from "../core/runtime/distributed-runtime.service.js";
import { SwarmRuntimeService } from "../core/swarm/swarm-runtime.service.js";
import { AiTeamService } from "../core/teams/ai-team.service.js";
import { RealAgentExecutionService } from "../core/agents/real-agent-execution.service.js";
import { OrchestratorService } from "../core/orchestrator/orchestrator.service.js";
import { OpenSourceRuntimeService } from "../core/open-source/open-source-runtime.service.js";
import { MultimodalCapabilityService } from "../core/multimodal/multimodal-capability.service.js";
import { createPostgresPool } from "../config/postgres.js";
import { createRedisClient } from "../config/redis.js";
import { AnthropicProvider } from "../providers/anthropic/anthropic.provider.js";
import { ElevenLabsProvider } from "../providers/elevenlabs/elevenlabs.provider.js";
import { FalProvider } from "../providers/fal/fal.provider.js";
import { GeminiProvider } from "../providers/gemini/gemini.provider.js";
import { OpenAiProvider } from "../providers/openai/openai.provider.js";
import { ProviderRegistry } from "../providers/provider-registry.js";
import { StabilityProvider } from "../providers/stability/stability.provider.js";
import { OpenAiCompatibleProvider } from "../providers/shared/openai-compatible.provider.js";
import { PostgresConversationRepository } from "../repositories/postgres-conversation.repository.js";
import { PostgresEventRepository } from "../repositories/postgres-event.repository.js";
import { PostgresJobRepository } from "../repositories/postgres-job.repository.js";
import { PostgresToolExecutionRepository } from "../repositories/postgres-tool-execution.repository.js";
import { PostgresWorkflowRepository } from "../repositories/postgres-workflow.repository.js";
import { PostgresMarketplaceExtensionRepository, PostgresMarketplaceInstallationRepository, PostgresMarketplaceReviewRepository } from "../repositories/postgres-marketplace.repository.js";

class PassthroughPromptOrchestrator {
  async compose({ task, context }) {
    return { ...task, context };
  }
}

class EmptyMemoryRuntime {
  async retrieve() {
    return { memories: [] };
  }

  async retrieveForTask() {
    return { memories: [] };
  }
}

class NoopContextRepository {
  async getRuntimeContext() { return null; }
  async getRuntimeSummary() { return null; }
  async getRuntimeProfile() { return null; }
  async getManifestForTask() { return null; }
}

export function configureProductionRuntime(app) {
  const pool = createPostgresPool();
  const redis = createRedisClient();
  const providerRegistry = new ProviderRegistry();
  const providerSettingsService = new ProviderSettingsService({ pool });
  const developerApiKeyService = new DeveloperApiKeyService({ pool });

  [
    new OpenAiProvider({ providerSettingsService }),
    new AnthropicProvider({ providerSettingsService }),
    new GeminiProvider({ providerSettingsService }),
    new ElevenLabsProvider({ providerSettingsService }),
    new FalProvider({ providerSettingsService }),
    new StabilityProvider({ providerSettingsService }),
    new OpenAiCompatibleProvider({ providerName: "openrouter", apiKey: process.env.OPENROUTER_API_KEY, envName: "OPENROUTER_API_KEY", baseUrl: "https://openrouter.ai/api/v1", defaultModel: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini", providerSettingsService }),
    new OpenAiCompatibleProvider({ providerName: "grok", apiKey: process.env.XAI_API_KEY, envName: "XAI_API_KEY", baseUrl: "https://api.x.ai/v1", defaultModel: process.env.XAI_MODEL || "grok-4", providerSettingsService }),
    new OpenAiCompatibleProvider({ providerName: "groq", apiKey: process.env.GROQ_API_KEY, envName: "GROQ_API_KEY", baseUrl: "https://api.groq.com/openai/v1", defaultModel: process.env.GROQ_MODEL || "llama-3.1-70b-versatile", providerSettingsService }),
    new OpenAiCompatibleProvider({ providerName: "mistral", apiKey: process.env.MISTRAL_API_KEY, envName: "MISTRAL_API_KEY", baseUrl: "https://api.mistral.ai/v1", defaultModel: process.env.MISTRAL_MODEL || "mistral-large-latest", providerSettingsService }),
    new OpenAiCompatibleProvider({ providerName: "deepseek", apiKey: process.env.DEEPSEEK_API_KEY, envName: "DEEPSEEK_API_KEY", baseUrl: "https://api.deepseek.com/v1", defaultModel: process.env.DEEPSEEK_MODEL || "deepseek-chat", providerSettingsService }),
    new OpenAiCompatibleProvider({ providerName: "together", apiKey: process.env.TOGETHER_API_KEY, envName: "TOGETHER_API_KEY", baseUrl: "https://api.together.xyz/v1", defaultModel: process.env.TOGETHER_MODEL || "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo", providerSettingsService }),
    new OpenAiCompatibleProvider({ providerName: "ollama", apiKey: process.env.OLLAMA_API_KEY, envName: "OLLAMA_API_KEY", baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1", defaultModel: process.env.OLLAMA_MODEL || "tinyllama", authRequired: false, providerSettingsService }),
  ].forEach((provider) => providerRegistry.register(provider));

  providerRegistry.get("openai").supportsStreaming = true;
  providerRegistry.get("openai").maxTokens = 128000;
  providerRegistry.get("anthropic").supportsStreaming = false;
  providerRegistry.get("anthropic").maxTokens = 200000;
  providerRegistry.get("gemini").supportsStreaming = true;
  providerRegistry.get("gemini").maxTokens = 1000000;
  providerRegistry.get("fal").supportsStreaming = false;
  providerRegistry.get("stability").supportsStreaming = false;
  providerRegistry.get("elevenlabs").supportsStreaming = false;
  ["openrouter", "grok", "groq", "mistral", "deepseek", "together", "ollama"].forEach((providerName) => {
    providerRegistry.get(providerName).supportsStreaming = true;
  });

  const eventBus = new RealtimeEventBus({ eventRepository: new PostgresEventRepository(pool) });
  const jobRepository = new PostgresJobRepository(pool);
  const usageService = new UsageLedgerService({ pool });
  const conversationService = new PostgresConversationRepository(pool);
  const embeddingRuntime = new EmbeddingRuntimeService({ providerRegistry, providerSettingsService });
  const enterpriseMemoryService = new EnterpriseMemoryService({ pool, providerRegistry, embeddingRuntime });
  const backgroundProcessor = redis
    ? new BackgroundProcessor({ queueAdapter: new BullMqQueueAdapter({ connection: redis }), eventBus, jobRepository })
    : new MissingQueueAdapter();

  const contextEngine = new AiContextEngine({
    memoryRetrievalRuntime: enterpriseMemoryService || new EmptyMemoryRuntime(),
    projectRepository: new NoopContextRepository(),
    conversationRepository: conversationService,
    personalizationService: new NoopContextRepository(),
    assetRepository: new NoopContextRepository(),
  });

  const providerHealthService = new ProviderHealthService();
  const modelRouter = new ModelRouterService({
    providerRegistry,
    providerHealthService,
    usageEstimator: new UsageEstimatorService(),
  });

  const providerRuntime = new AiProviderRuntime({
    retryPolicy: {
      maxAttempts: Number(process.env.PROVIDER_MAX_ATTEMPTS || 2),
      baseDelayMs: Number(process.env.PROVIDER_RETRY_BASE_DELAY_MS || 500),
    },
    timeoutMs: Number(process.env.PROVIDER_TIMEOUT_MS || 120000),
    telemetry: {
      recordProviderSuccess(event) {
        providerHealthService.recordSuccess(event);
      },
      recordProviderError(event) {
        providerHealthService.recordFailure(event);
      },
      recordProviderRetry(event) {
        providerHealthService.recordFailure({ ...event, retry: true });
      },
      recordProviderFailover() {
        // Failover is a routing outcome; the underlying provider error is recorded separately.
      },
    },
  });

  const streamingEngine = new StreamingResponseEngine({ eventBus, conversationService, usageService });
  const toolRegistry = new ToolRegistry();
  const workflowRepository = new PostgresWorkflowRepository(pool);
  const browserAutomation = new BrowserAutomationService({ headless: process.env.PLAYWRIGHT_HEADLESS !== "false" });
  const toolExecutionEngine = new ToolExecutionEngine({
    toolRegistry,
    permissionService: new ToolPermissionService(),
    sandboxPolicy: new SandboxPolicy({
      allowNetwork: true,
      allowShell: process.env.ENABLE_TERMINAL_TOOL === "true",
      allowFileWrite: process.env.ENABLE_FILE_WRITE_TOOL === "true",
    }),
    backgroundProcessor,
    eventBus,
    executionRepository: new PostgresToolExecutionRepository(pool),
  });

  app.locals.pool = pool;
  app.locals.redis = redis;
  app.locals.eventBus = eventBus;
  app.locals.providerRegistry = providerRegistry;
  app.locals.providerSettingsService = providerSettingsService;
  app.locals.developerApiKeyService = developerApiKeyService;
  app.locals.embeddingRuntime = embeddingRuntime;
  app.locals.enterpriseCloudService = new EnterpriseCloudService({ pool, providerRegistry, providerHealthService, modelRouter });
  app.locals.providerHealthService = providerHealthService;
  app.locals.openSourceRuntimeService = new OpenSourceRuntimeService({
    providerRegistry,
    pool,
    redis,
    eventBus,
  });
  app.locals.gpuCapabilityService = new GpuCapabilityService({ eventBus });
  app.locals.multimodalCapabilityService = new MultimodalCapabilityService({
    pool,
    eventBus,
    openSourceRuntimeService: app.locals.openSourceRuntimeService,
    gpuCapabilityService: app.locals.gpuCapabilityService,
  });
  app.locals.toolRegistry = toolRegistry;
  app.locals.toolExecutionEngine = toolExecutionEngine;
  app.locals.runtimeEngine = new AiRuntimeEngine({
    contextEngine,
    promptOrchestrator: new PassthroughPromptOrchestrator(),
    modelRouter,
    providerRuntime,
    streamingEngine,
    usageService,
    jobQueue: backgroundProcessor,
    eventBus,
    conversationService,
  });
  app.locals.aiStudioService = new AiStudioService({
    pool,
    runtimeEngine: app.locals.runtimeEngine,
    providerRegistry,
    eventBus,
  });
  app.locals.backgroundProcessor = backgroundProcessor;
  const appProjectGenerator = new AppProjectGeneratorService({ pool, aiRuntimeEngine: app.locals.runtimeEngine });
  registerDefaultTools(toolRegistry, {
    browserAutomation,
    aiRuntimeEngine: app.locals.runtimeEngine,
    appProjectGenerator,
  });
  app.locals.agentExecutionService = new RealAgentExecutionService({
    pool,
    aiRuntimeEngine: app.locals.runtimeEngine,
    eventBus,
    memoryService: enterpriseMemoryService,
  });
  app.locals.orchestratorService = new OrchestratorService({
    pool,
    aiRuntimeEngine: app.locals.runtimeEngine,
    toolExecutionEngine,
    eventBus,
    retrievalService: {
      async retrieve({ workspaceId, projectId, query, limit }) {
        if (!pool) return [];
        return enterpriseMemoryService.search({ workspaceId, projectId, query, limit: limit || 8 });
      },
    },
  });
  app.locals.workflowRepository = workflowRepository;
  app.locals.workflowEngine = new WorkflowEngine({
    aiRuntimeEngine: app.locals.runtimeEngine,
    multiAgentRuntime: app.locals.agentExecutionService,
    eventBus,
    workflowRepository,
    backgroundProcessor,
    toolExecutionEngine,
  });
  app.locals.selfImprovementEngine = new SelfImprovementEngine({
    pool,
    aiRuntimeEngine: app.locals.runtimeEngine,
    eventBus,
  });
  app.locals.aiEmployeeService = new AiEmployeeService({
    pool,
    orchestratorService: app.locals.orchestratorService,
    eventBus,
  });
  app.locals.autonomousCycleService = new AutonomousCycleService({
    pool,
    orchestratorService: app.locals.orchestratorService,
    selfImprovementEngine: app.locals.selfImprovementEngine,
    eventBus,
  });
  app.locals.appFactoryService = new AppFactoryService({
    pool,
    appProjectGenerator,
    toolExecutionEngine,
    eventBus,
  });
  app.locals.computerUseService = new ComputerUseService({
    pool,
    browserAutomation,
    eventBus,
  });
  app.locals.marketplaceService = new MarketplaceService({
    extensionRepository: new PostgresMarketplaceExtensionRepository(pool),
    installationRepository: new PostgresMarketplaceInstallationRepository(pool),
    reviewRepository: new PostgresMarketplaceReviewRepository(pool),
    eventBus,
  });
  app.locals.distributedRuntimeService = new DistributedRuntimeService({ pool, eventBus });
  app.locals.cloudDeploymentService = new CloudDeploymentService({ pool, toolExecutionEngine, eventBus });
  app.locals.enterpriseMemoryService = enterpriseMemoryService;
  app.locals.aiTeamService = new AiTeamService({ pool, eventBus });
  app.locals.selfHealingService = new SelfHealingService({
    pool,
    aiRuntimeEngine: app.locals.runtimeEngine,
    orchestratorService: app.locals.orchestratorService,
    eventBus,
  });
  app.locals.dynamicToolService = new DynamicToolService({ pool, toolRegistry, eventBus });
  app.locals.dynamicToolService.loadWorkspaceTools().catch((error) => {
    console.warn(`Dynamic tool load failed: ${error.message}`);
  });
  app.locals.modelRoutingAnalyticsService = new ModelRoutingAnalyticsService({ pool });
  app.locals.missionControlService = new MissionControlService({
    pool,
    orchestratorService: app.locals.orchestratorService,
    autonomousCycleService: app.locals.autonomousCycleService,
    eventBus,
  });
  app.locals.realtimeKnowledgeService = new RealtimeKnowledgeService({
    pool,
    toolExecutionEngine,
    aiRuntimeEngine: app.locals.runtimeEngine,
    providerRegistry,
    eventBus,
    chunkingService: new ChunkingService(),
  });
  app.locals.internetExecutionService = new InternetExecutionService({
    pool,
    aiRuntimeEngine: app.locals.runtimeEngine,
    computerUseService: app.locals.computerUseService,
    eventBus,
  });
  app.locals.runtimeTelemetryService = new RuntimeTelemetryService({ pool, eventBus });
  app.locals.infrastructureSupervisor = new InfrastructureSupervisorService({ pool, redis, eventBus });
  app.locals.distributedExecutionService = new DistributedExecutionService({
    pool,
    eventBus,
    distributedRuntimeService: app.locals.distributedRuntimeService,
    internetExecutionService: app.locals.internetExecutionService,
    missionControlService: app.locals.missionControlService,
    cloudDeploymentService: app.locals.cloudDeploymentService,
    toolExecutionEngine,
    runtimeTelemetryService: app.locals.runtimeTelemetryService,
  });
  app.locals.swarmRuntimeService = new SwarmRuntimeService({
    pool,
    eventBus,
    distributedRuntimeService: app.locals.distributedRuntimeService,
    distributedExecutionService: app.locals.distributedExecutionService,
    runtimeTelemetryService: app.locals.runtimeTelemetryService,
  });
  app.locals.civilizationRuntimeService = new CivilizationRuntimeService({
    pool,
    eventBus,
    swarmRuntimeService: app.locals.swarmRuntimeService,
    distributedExecutionService: app.locals.distributedExecutionService,
    selfImprovementEngine: app.locals.selfImprovementEngine,
    dynamicToolService: app.locals.dynamicToolService,
    cloudDeploymentService: app.locals.cloudDeploymentService,
    runtimeTelemetryService: app.locals.runtimeTelemetryService,
  });
  app.locals.planetaryIntelligenceService = new PlanetaryIntelligenceService({
    pool,
    eventBus,
    civilizationRuntimeService: app.locals.civilizationRuntimeService,
    swarmRuntimeService: app.locals.swarmRuntimeService,
    distributedExecutionService: app.locals.distributedExecutionService,
    dynamicToolService: app.locals.dynamicToolService,
    runtimeTelemetryService: app.locals.runtimeTelemetryService,
  });
  app.locals.cosmosIntelligenceService = new CosmosIntelligenceService({
    pool,
    eventBus,
    planetaryIntelligenceService: app.locals.planetaryIntelligenceService,
    civilizationRuntimeService: app.locals.civilizationRuntimeService,
    swarmRuntimeService: app.locals.swarmRuntimeService,
    distributedExecutionService: app.locals.distributedExecutionService,
    dynamicToolService: app.locals.dynamicToolService,
    runtimeTelemetryService: app.locals.runtimeTelemetryService,
  });
  app.locals.agiFederationService = new AgiFederationService({
    pool,
    eventBus,
    distributedRuntimeService: app.locals.distributedRuntimeService,
    distributedExecutionService: app.locals.distributedExecutionService,
    infrastructureSupervisor: app.locals.infrastructureSupervisor,
    runtimeTelemetryService: app.locals.runtimeTelemetryService,
  });
  app.locals.civilizationNetworkService = new CivilizationNetworkService({
    pool,
    eventBus,
    civilizationRuntimeService: app.locals.civilizationRuntimeService,
    agiFederationService: app.locals.agiFederationService,
    distributedExecutionService: app.locals.distributedExecutionService,
    infrastructureSupervisor: app.locals.infrastructureSupervisor,
    runtimeTelemetryService: app.locals.runtimeTelemetryService,
  });
  app.locals.metaIntelligenceService = new MetaIntelligenceService({
    pool,
    eventBus,
    civilizationNetworkService: app.locals.civilizationNetworkService,
    agiFederationService: app.locals.agiFederationService,
    infrastructureSupervisor: app.locals.infrastructureSupervisor,
    runtimeTelemetryService: app.locals.runtimeTelemetryService,
  });
  app.locals.superintelligenceMeshService = new SuperintelligenceMeshService({
    pool,
    eventBus,
    metaIntelligenceService: app.locals.metaIntelligenceService,
    infrastructureSupervisor: app.locals.infrastructureSupervisor,
    runtimeTelemetryService: app.locals.runtimeTelemetryService,
  });
  app.locals.quantumIntelligenceService = new QuantumIntelligenceService({
    pool,
    eventBus,
    superintelligenceMeshService: app.locals.superintelligenceMeshService,
    infrastructureSupervisor: app.locals.infrastructureSupervisor,
    runtimeTelemetryService: app.locals.runtimeTelemetryService,
  });
  app.locals.productionIntelligenceService = new ProductionIntelligenceService({
    pool,
    redis,
    eventBus,
    infrastructureSupervisor: app.locals.infrastructureSupervisor,
    distributedExecutionService: app.locals.distributedExecutionService,
    distributedRuntimeService: app.locals.distributedRuntimeService,
    runtimeTelemetryService: app.locals.runtimeTelemetryService,
    cloudDeploymentService: app.locals.cloudDeploymentService,
  });
  app.locals.infrastructureActivationService = new InfrastructureActivationService({
    pool,
    redis,
    eventBus,
    infrastructureSupervisor: app.locals.infrastructureSupervisor,
  });
  app.locals.containerRuntimeService = new ContainerRuntimeService({
    infrastructureActivationService: app.locals.infrastructureActivationService,
    eventBus,
  });
  app.locals.workerSupervisorService = new WorkerSupervisorService({
    redis,
    distributedRuntimeService: app.locals.distributedRuntimeService,
    distributedExecutionService: app.locals.distributedExecutionService,
    productionIntelligenceService: app.locals.productionIntelligenceService,
    eventBus,
  });
  app.locals.runtimeRecoveryService = new RuntimeRecoveryService({
    pool,
    eventBus,
    infrastructureActivationService: app.locals.infrastructureActivationService,
    productionIntelligenceService: app.locals.productionIntelligenceService,
    distributedExecutionService: app.locals.distributedExecutionService,
    workerSupervisorService: app.locals.workerSupervisorService,
  });
  app.locals.cpuRuntimeService = new CpuRuntimeService({
    pool,
    redis,
    workerSupervisorService: app.locals.workerSupervisorService,
    eventBus,
  });
  app.locals.globalExecutionGridService = new GlobalExecutionGridService({
    pool,
    eventBus,
    productionIntelligenceService: app.locals.productionIntelligenceService,
    distributedRuntimeService: app.locals.distributedRuntimeService,
    distributedExecutionService: app.locals.distributedExecutionService,
    infrastructureSupervisor: app.locals.infrastructureSupervisor,
    runtimeTelemetryService: app.locals.runtimeTelemetryService,
  });

  return app.locals;
}
