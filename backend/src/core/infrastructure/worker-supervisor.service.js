export class WorkerSupervisorService {
  constructor({ redis, distributedRuntimeService, distributedExecutionService, productionIntelligenceService, eventBus }) {
    this.redis = redis;
    this.distributedRuntimeService = distributedRuntimeService;
    this.distributedExecutionService = distributedExecutionService;
    this.productionIntelligenceService = productionIntelligenceService;
    this.eventBus = eventBus;
  }

  async workers({ workspaceId }) {
    const metrics = await this.productionIntelligenceService.metrics({ workspaceId });
    return {
      status: metrics.queue?.status === "ok" ? "ready" : "queue_blocked",
      nodes: metrics.nodes || [],
      taskAnalytics: metrics.taskAnalytics || { summary: [], latency: [] },
      telemetry: metrics.telemetry || [],
      summary: metrics.summary || {},
      queue: metrics.queue || {},
    };
  }

  async register({ workspaceId, nodeName, capabilities = [], loadScore = 0, metadata = {} }) {
    const configuredToken = process.env.WORKER_NODE_TOKEN;
    if (configuredToken && metadata?.nodeToken !== configuredToken) {
      throw Object.assign(new Error("Worker node authentication failed."), { statusCode: 401 });
    }
    const safeMetadata = { ...metadata };
    delete safeMetadata.nodeToken;
    const node = await this.distributedRuntimeService.heartbeat({ workspaceId, nodeName, capabilities, loadScore, metadata: safeMetadata });
    await this.#event({ workspaceId, type: "runtime.worker.registered", payload: { nodeId: node.id, nodeName } });
    return { node };
  }

  async schedule({ workspaceId, userId, taskType = "telemetry_record", requiredCapability, priority = 5, payload = {} }) {
    const task = await this.distributedExecutionService.schedule({
      workspaceId,
      userId,
      source: "worker_supervisor",
      taskType,
      requiredCapability,
      priority,
      payload: taskType === "telemetry_record"
        ? { metric: payload.metric || "runtime.worker.supervisor.schedule", value: payload.value ?? 1, unit: payload.unit || "event", metadata: payload.metadata || {} }
        : payload,
    });
    await this.#event({ workspaceId, type: "runtime.worker.task.scheduled", payload: { taskId: task.id, taskType } });
    return { task };
  }

  async queues({ workspaceId }) {
    const metrics = await this.productionIntelligenceService.metrics({ workspaceId });
    let redisInfo = null;
    if (this.redis) {
      try {
        const startedAt = Date.now();
        const ping = await this.redis.ping();
        redisInfo = { status: ping === "PONG" ? "ok" : "degraded", ping, latencyMs: Date.now() - startedAt };
      } catch (error) {
        redisInfo = { status: "down", error: error.message };
      }
    } else {
      redisInfo = { status: "not_configured" };
    }
    return {
      status: redisInfo.status === "ok" ? "ready" : "blocked",
      redis: redisInfo,
      queue: metrics.queue || {},
      taskAnalytics: metrics.taskAnalytics || { summary: [], latency: [] },
      summary: metrics.summary || {},
    };
  }

  async #event({ workspaceId, type, payload }) {
    await this.eventBus?.publish?.({ workspaceId, channel: `workspace:${workspaceId}`, type, payload });
  }
}
