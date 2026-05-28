import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export class GlobalExecutionGridService {
  constructor({
    pool,
    eventBus,
    productionIntelligenceService,
    distributedRuntimeService,
    distributedExecutionService,
    infrastructureSupervisor,
    runtimeTelemetryService,
  }) {
    this.pool = pool;
    this.eventBus = eventBus;
    this.productionIntelligenceService = productionIntelligenceService;
    this.distributedRuntimeService = distributedRuntimeService;
    this.distributedExecutionService = distributedExecutionService;
    this.infrastructureSupervisor = infrastructureSupervisor;
    this.runtimeTelemetryService = runtimeTelemetryService;
  }

  async status({ workspaceId }) {
    if (!workspaceId) throw new Error("workspaceId is required.");
    const [diagnostics, production, metrics, runtimeGraph, workers, memorySync, containerEvents, audits, events] = await Promise.all([
      this.infrastructureSupervisor.diagnostics(),
      this.#safeCall(() => this.productionIntelligenceService.status({ workspaceId }), null),
      this.#safeCall(() => this.productionIntelligenceService.metrics({ workspaceId }), { summary: {}, nodes: [], taskAnalytics: { summary: [], latency: [] }, queue: {}, telemetry: [] }),
      this.#safeCall(() => this.distributedRuntimeService.graph({ workspaceId }), { nodes: [], edges: [] }),
      this.#safeQuery("select * from grid_worker_identities where workspace_id = $1 order by status asc, last_sync_at desc nulls last, created_at desc limit 50", [workspaceId]),
      this.#safeQuery("select * from grid_memory_sync_events where workspace_id = $1 order by created_at desc limit 50", [workspaceId]),
      this.#safeQuery("select * from grid_container_events where workspace_id = $1 order by created_at desc limit 50", [workspaceId]),
      this.#safeQuery("select * from grid_execution_audits where workspace_id = $1 order by created_at desc limit 50", [workspaceId]),
      this.#safeQuery("select * from global_execution_grid_events where workspace_id = $1 order by created_at desc limit 75", [workspaceId]),
    ]);

    const topology = this.#topology({ runtimeGraph, workers, diagnostics, metrics });
    return {
      status: diagnostics.status === "ready" && metrics.queue?.status === "ok" ? "operational" : "infrastructure_blocked",
      diagnostics,
      production,
      metrics,
      topology,
      workers,
      memorySync,
      containerEvents,
      audits,
      events,
      dependencyGraph: this.#dependencyGraph(diagnostics, metrics),
      endpoints: {
        status: "/api/global-execution-grid/status",
        topology: "/api/global-execution-grid/topology",
        workerRegister: "/api/global-execution-grid/workers/register",
        workloadRoute: "/api/global-execution-grid/workloads/route",
        containers: "/api/global-execution-grid/containers/status",
        memorySync: "/api/global-execution-grid/memory/sync",
        audit: "/api/global-execution-grid/security/audit",
        websocket: "/ws",
      },
    };
  }

  async topology({ workspaceId }) {
    const status = await this.status({ workspaceId });
    return {
      status: status.status,
      topology: status.topology,
      dependencyGraph: status.dependencyGraph,
      diagnostics: status.diagnostics,
      metrics: status.metrics,
    };
  }

  async registerWorker({
    workspaceId,
    userId,
    workerName,
    workerRole = "ai_worker",
    capabilities = [],
    permissions = {},
    loadScore = 0,
    metadata = {},
  }) {
    if (!workspaceId || !workerName) throw new Error("workspaceId and workerName are required.");
    const node = await this.distributedRuntimeService.heartbeat({
      workspaceId,
      nodeName: workerName,
      capabilities,
      loadScore,
      metadata: { ...metadata, gridRole: workerRole, registeredBy: userId || null },
    });
    const id = randomUUID();
    await this.pool.query(
      `insert into grid_worker_identities
       (id, workspace_id, runtime_node_id, worker_name, worker_role, capabilities, permissions, status, last_sync_at, created_by, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, 'online', now(), $8, now(), now())`,
      [id, workspaceId, node.id, workerName, workerRole, capabilities, permissions, userId || null]
    );
    await this.#event({ workspaceId, eventType: "grid.worker.registered", severity: "info", subjectRef: id, createdBy: userId, payload: { workerName, runtimeNodeId: node.id, capabilities } });
    await this.#telemetry({ workspaceId, nodeId: node.id, metric: "global_grid.workers.registered", value: 1, unit: "worker", metadata: { workerRole } });
    return { worker: await this.#getWorker({ workspaceId, id }), runtimeNode: node };
  }

  async routeWorkload({ workspaceId, projectId, userId, taskType = "telemetry_record", requiredCapability, priority = 5, payload = {} }) {
    if (!workspaceId) throw new Error("workspaceId is required.");
    const metrics = await this.productionIntelligenceService.metrics({ workspaceId });
    const routingMode = metrics.queue?.status === "ok" ? "distributed_queue" : "persistent_direct_schedule";
    const taskPayload = taskType === "telemetry_record"
      ? { metric: payload.metric || "global_grid.workload.routed", value: payload.value ?? 1, unit: payload.unit || "event", metadata: payload.metadata || { source: "global-execution-grid" } }
      : payload;
    const task = await this.distributedExecutionService.schedule({
      workspaceId,
      projectId,
      userId,
      source: "global_execution_grid",
      taskType,
      requiredCapability,
      priority,
      payload: taskPayload,
      maxAttempts: 3,
    });
    await this.#event({ workspaceId, eventType: "grid.workload.routed", severity: "info", subjectRef: task.id, createdBy: userId, payload: { taskType, requiredCapability, routingMode } });
    return { task, routingMode, metrics };
  }

  async recover({ workspaceId, userId }) {
    const [distributedRecovery, productionRecovery] = await Promise.all([
      this.#safeCall(() => this.distributedExecutionService.recover({ workspaceId, userId }), { recovered: [], error: "distributed recovery unavailable" }),
      this.#safeCall(() => this.productionIntelligenceService.recover({ workspaceId, userId }), { status: "blocked", error: "production recovery unavailable" }),
    ]);
    await this.#event({ workspaceId, eventType: "grid.recovery.completed", severity: "warning", createdBy: userId, payload: { distributedRecovery, productionRecovery } });
    return { distributedRecovery, productionRecovery };
  }

  async containerStatus({ workspaceId, userId }) {
    const diagnostics = await this.infrastructureSupervisor.diagnostics();
    let result;
    if (!diagnostics.checks?.docker?.available) {
      result = { status: "blocked", containers: [], reason: "Docker CLI is not available. Install Docker Desktop before enabling isolated execution containers." };
    } else {
      const command = await this.#runCommand("docker", ["ps", "--format", "{{.ID}}|{{.Image}}|{{.Names}}|{{.Status}}"]);
      result = command.status === "ok"
        ? { status: "ok", containers: this.#parseDockerPs(command.output) }
        : { status: "blocked", containers: [], reason: command.error || command.output };
    }
    await this.#persist(
      `insert into grid_container_events (id, workspace_id, container_ref, action, status, detail, created_by, created_at)
       values ($1, $2, $3, 'status', $4, $5, $6, now())`,
      [randomUUID(), workspaceId, result.containers?.[0]?.id || null, result.status, result, userId || null],
      null
    );
    await this.#event({ workspaceId, eventType: "grid.containers.status", severity: result.status === "ok" ? "info" : "warning", createdBy: userId, payload: result });
    return { diagnostics, ...result };
  }

  async syncMemory({ workspaceId, userId, workerId, memoryType = "runtime_sync", payload = {}, syncScore = 0.5 }) {
    if (!workspaceId) throw new Error("workspaceId is required.");
    const id = randomUUID();
    await this.pool.query(
      `insert into grid_memory_sync_events (id, workspace_id, worker_id, memory_type, payload, sync_score, created_by, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, now())`,
      [id, workspaceId, workerId || null, memoryType, payload, Number(syncScore), userId || null]
    );
    await this.#event({ workspaceId, eventType: "grid.memory.synchronized", severity: "info", subjectRef: id, createdBy: userId, payload: { workerId, memoryType, syncScore } });
    return { id, memoryType, syncScore };
  }

  async audit({ workspaceId, userId, auditType = "execution_governance" }) {
    const diagnostics = await this.infrastructureSupervisor.diagnostics();
    const metrics = await this.productionIntelligenceService.metrics({ workspaceId });
    const findings = [
      diagnostics.checks?.postgres?.status !== "ok" ? { severity: "high", issue: "postgres_unavailable", action: "Start PostgreSQL and run migrations before enabling durable grid execution." } : null,
      diagnostics.checks?.redis?.status !== "ok" ? { severity: "medium", issue: "redis_unavailable", action: "Start Redis before enabling distributed queue workers." } : null,
      !diagnostics.checks?.docker?.available ? { severity: "medium", issue: "docker_unavailable", action: "Install Docker Desktop before enabling isolated execution containers." } : null,
      metrics.queue?.status !== "ok" ? { severity: "medium", issue: "queue_degraded", action: "Keep routing in conservative persistent-direct mode until Redis is healthy." } : null,
    ].filter(Boolean);
    const trustScore = Number(Math.max(0, Math.min(1, (diagnostics.readinessScore || 0) / 100 - findings.length * 0.05)).toFixed(2));
    const id = randomUUID();
    await this.#persist(
      `insert into grid_execution_audits
       (id, workspace_id, audit_type, subject_ref, findings, trust_score, enforcement_state, created_by, created_at)
       values ($1, $2, $3, 'global_execution_grid', $4, $5, $6, $7, now())`,
      [id, workspaceId, auditType, JSON.stringify(findings), trustScore, findings.length ? "guarded" : "clear", userId || null],
      null
    );
    await this.#event({ workspaceId, eventType: "grid.security.audit.completed", severity: findings.length ? "warning" : "info", subjectRef: id, createdBy: userId, payload: { findings, trustScore } });
    return { id, auditType, findings, trustScore, enforcementState: findings.length ? "guarded" : "clear" };
  }

  #topology({ runtimeGraph, workers, diagnostics, metrics }) {
    const infraNodes = [
      { id: "postgres", label: "PostgreSQL", type: "dependency", status: diagnostics.checks?.postgres?.status || "unknown" },
      { id: "redis", label: "Redis Queue", type: "dependency", status: diagnostics.checks?.redis?.status || metrics.queue?.status || "unknown" },
      { id: "docker", label: "Docker Containers", type: "dependency", status: diagnostics.checks?.docker?.available ? "available" : "missing" },
      { id: "websocket", label: "Realtime WebSocket", type: "realtime", status: diagnostics.checks?.websocket?.status || "unknown" },
    ];
    const runtimeNodes = (runtimeGraph.nodes || []).map((node) => ({
      id: node.id,
      label: node.node_name || node.id,
      type: "runtime_node",
      status: node.status,
      healthScore: Number(node.health_score || 0),
      loadScore: Number(node.load_score || 0),
    }));
    const workerNodes = workers.map((worker) => ({
      id: worker.id,
      label: worker.worker_name,
      type: "ai_worker",
      status: worker.status,
      runtimeNodeId: worker.runtime_node_id,
    }));
    const edges = [
      { source: "postgres", target: "websocket", type: "event_persistence" },
      { source: "redis", target: "websocket", type: "queue_streaming" },
      { source: "docker", target: "redis", type: "container_runtime" },
      ...workerNodes.filter((worker) => worker.runtimeNodeId).map((worker) => ({ source: worker.runtimeNodeId, target: worker.id, type: "worker_identity" })),
      ...(runtimeGraph.edges || []).map((edge) => ({ source: edge.from || edge.source, target: edge.to || edge.target, type: edge.type || "capability" })),
    ];
    return { nodes: [...infraNodes, ...runtimeNodes, ...workerNodes], edges };
  }

  #dependencyGraph(diagnostics, metrics) {
    return {
      nodes: [
        { id: "postgres", label: "PostgreSQL readiness detection", status: diagnostics.checks?.postgres?.status || "unknown" },
        { id: "redis", label: "Redis readiness detection", status: diagnostics.checks?.redis?.status || "unknown" },
        { id: "docker", label: "Docker readiness detection", status: diagnostics.checks?.docker?.available ? "available" : "missing" },
        { id: "migrations", label: "Migration execution supervisor", status: diagnostics.checks?.migrations?.status || "unknown" },
        { id: "queues", label: "Distributed execution queue", status: metrics.queue?.status || "unknown" },
        { id: "telemetry", label: "Realtime telemetry streams", status: diagnostics.checks?.websocket?.status || "unknown" },
      ],
      edges: [
        { source: "postgres", target: "migrations" },
        { source: "migrations", target: "telemetry" },
        { source: "redis", target: "queues" },
        { source: "docker", target: "queues" },
        { source: "queues", target: "telemetry" },
      ],
    };
  }

  async #getWorker({ workspaceId, id }) {
    const result = await this.pool.query("select * from grid_worker_identities where id = $1 and workspace_id = $2", [id, workspaceId]);
    return result.rows[0];
  }

  async #safeQuery(sql, params = []) {
    if (!this.pool) return [];
    try {
      const result = await this.pool.query(sql, params);
      return result.rows;
    } catch {
      return [];
    }
  }

  async #safeCall(fn, fallback) {
    try {
      return await fn();
    } catch (error) {
      if (fallback && typeof fallback === "object" && !Array.isArray(fallback)) {
        return { ...fallback, error: this.#errorMessage(error) };
      }
      return { value: fallback, error: this.#errorMessage(error) };
    }
  }

  async #persist(sql, params, fallbackEvent) {
    if (!this.pool) {
      if (fallbackEvent) await this.#event({ workspaceId: fallbackEvent.workspaceId, eventType: fallbackEvent.eventType, severity: "warning", payload: { reason: "DATABASE_URL not configured" } });
      return { status: "blocked", error: "DATABASE_URL not configured" };
    }
    try {
      await this.pool.query(sql, params);
      return { status: "ok" };
    } catch (error) {
      if (fallbackEvent) await this.#event({ workspaceId: fallbackEvent.workspaceId, eventType: fallbackEvent.eventType, severity: "warning", payload: { error: this.#errorMessage(error) } });
      return { status: "blocked", error: this.#errorMessage(error) };
    }
  }

  async #telemetry({ workspaceId, nodeId, metric, value, unit, metadata }) {
    try {
      await this.runtimeTelemetryService?.record?.({ workspaceId, nodeId, metric, value, unit, metadata });
    } catch {
      await this.eventBus?.publish?.({ workspaceId, channel: `workspace:${workspaceId}`, type: "grid.telemetry.buffered", payload: { metric, value } });
    }
  }

  async #event({ workspaceId, eventType, severity = "info", subjectRef = null, createdBy = null, payload = {} }) {
    await this.#persist(
      `insert into global_execution_grid_events (id, workspace_id, event_type, severity, subject_ref, payload, created_by, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, now())`,
      [randomUUID(), workspaceId, eventType, severity, subjectRef, payload, createdBy || null],
      null
    );
    await this.eventBus?.publish?.({ workspaceId, channel: `workspace:${workspaceId}`, type: eventType, payload });
  }

  async #runCommand(command, args) {
    try {
      const { stdout, stderr } = await execFileAsync(command, args, { timeout: 15000, windowsHide: true });
      return { status: "ok", output: (stdout || stderr).trim() };
    } catch (error) {
      return { status: "failed", error: this.#errorMessage(error) };
    }
  }

  #parseDockerPs(output = "") {
    return output.split(/\r?\n/).filter(Boolean).map((line) => {
      const [id, image, name, status] = line.split("|");
      return { id, image, name, status };
    });
  }

  #errorMessage(error) {
    if (error?.message) return error.message;
    if (Array.isArray(error?.errors) && error.errors.length) {
      return error.errors.map((item) => item.message || item.code).filter(Boolean).join("; ");
    }
    return String(error);
  }
}
