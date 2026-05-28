import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export class ProductionIntelligenceService {
  constructor({
    pool,
    redis,
    eventBus,
    infrastructureSupervisor,
    distributedExecutionService,
    distributedRuntimeService,
    runtimeTelemetryService,
    cloudDeploymentService,
  }) {
    this.pool = pool;
    this.redis = redis;
    this.eventBus = eventBus;
    this.infrastructureSupervisor = infrastructureSupervisor;
    this.distributedExecutionService = distributedExecutionService;
    this.distributedRuntimeService = distributedRuntimeService;
    this.runtimeTelemetryService = runtimeTelemetryService;
    this.cloudDeploymentService = cloudDeploymentService;
  }

  async status({ workspaceId }) {
    const diagnostics = await this.infrastructureSupervisor.diagnostics();
    const [activationRuns, evolutionCycles, checkpoints, audits, events, lifecycleActions, orchestrationDecisions] = await Promise.all([
      this.#safeQuery("select * from production_activation_runs where workspace_id = $1 order by created_at desc limit 20", [workspaceId]),
      this.#safeQuery("select * from runtime_evolution_cycles where workspace_id = $1 order by created_at desc limit 20", [workspaceId]),
      this.#safeQuery("select * from production_recovery_checkpoints where workspace_id = $1 order by created_at desc limit 20", [workspaceId]),
      this.#safeQuery("select * from production_security_governance_audits where workspace_id = $1 order by created_at desc limit 20", [workspaceId]),
      this.#safeQuery("select * from production_observability_events where workspace_id = $1 order by created_at desc limit 50", [workspaceId]),
      this.#safeQuery("select * from production_lifecycle_actions where workspace_id = $1 order by created_at desc limit 20", [workspaceId]),
      this.#safeQuery("select * from production_orchestration_decisions where workspace_id = $1 order by created_at desc limit 20", [workspaceId]),
    ]);
    const queue = await this.#queueStatus();
    const orchestration = await this.metrics({ workspaceId });
    return {
      diagnostics,
      queue,
      orchestration,
      dependencyGraph: this.#dependencyGraph(diagnostics, queue),
      activationRuns,
      evolutionCycles,
      checkpoints,
      audits,
      events,
      lifecycleActions,
      orchestrationDecisions,
      endpoints: {
        health: "/api/health",
        infrastructure: "/api/deployment/infrastructure/status",
        verify: "/api/production-intelligence/verify",
        websocket: "/ws",
      },
    };
  }

  async activate({ workspaceId, userId, runMigrations = true }) {
    const id = randomUUID();
    const before = await this.infrastructureSupervisor.diagnostics();
    const recovery = await this.infrastructureSupervisor.recover({ runMigrations });
    const after = recovery.after || await this.infrastructureSupervisor.diagnostics();
    const status = after.status === "ready" ? "activated" : "blocked";
    const actions = recovery.actions || [];
    await this.#persist(
      `insert into production_activation_runs
       (id, workspace_id, run_type, status, diagnostics, actions, readiness_score, created_by, created_at, completed_at)
       values ($1, $2, 'infrastructure_activation', $3, $4, $5, $6, $7, now(), now())`,
      [id, workspaceId, status, { before, after }, JSON.stringify(actions), Number(after.readinessScore || 0), userId || null],
      { workspaceId, eventType: "production.activation.persistence_blocked" }
    );
    await this.#observe({ workspaceId, eventType: "production.activation.completed", severity: status === "activated" ? "info" : "warning", payload: { runId: id, status, readinessScore: after.readinessScore, actions } });
    return { id, status, before, actions, after };
  }

  async evolveRuntime({ workspaceId, userId, objective = "Optimize production runtime convergence" }) {
    const diagnostics = await this.infrastructureSupervisor.diagnostics();
    const bottlenecks = [
      diagnostics.checks?.postgres?.status !== "ok" ? "postgres_unavailable" : null,
      diagnostics.checks?.redis?.status !== "ok" ? "redis_unavailable" : null,
      diagnostics.checks?.persistence?.status !== "ok" ? "persistence_blocked" : null,
      diagnostics.checks?.realtimeEvents?.bufferedEvents > 0 ? "realtime_buffer_pressure" : null,
    ].filter(Boolean);
    const optimizationPlan = {
      immediate: bottlenecks.includes("postgres_unavailable") ? "start PostgreSQL and run migrations" : "increase distributed execution throughput",
      queue: bottlenecks.includes("redis_unavailable") ? "start Redis before enabling BullMQ workers" : "enable adaptive worker scaling",
      recovery: "record checkpoint and isolate failed execution tasks",
      generatedAt: new Date().toISOString(),
    };
    const convergenceScore = Math.max(0, Math.min(1, Number((Number(diagnostics.readinessScore || 0) / 100).toFixed(2))));
    const id = randomUUID();
    await this.#persist(
      `insert into runtime_evolution_cycles
       (id, workspace_id, objective, bottlenecks, optimization_plan, convergence_score, status, created_by, created_at, completed_at)
       values ($1, $2, $3, $4, $5, $6, 'completed', $7, now(), now())`,
      [id, workspaceId, objective, JSON.stringify(bottlenecks), optimizationPlan, convergenceScore, userId || null],
      { workspaceId, eventType: "production.evolution.persistence_blocked" }
    );
    await this.#recordTelemetry({ workspaceId, metric: "production.evolution.convergence", value: convergenceScore, unit: "score", metadata: { bottlenecks } });
    await this.#observe({ workspaceId, eventType: "production.evolution.completed", severity: bottlenecks.length ? "warning" : "info", payload: { id, bottlenecks, convergenceScore } });
    return { id, objective, bottlenecks, optimizationPlan, convergenceScore };
  }

  async checkpoint({ workspaceId, userId, checkpointType = "production_runtime" }) {
    const [diagnostics, queue, tasks, nodes] = await Promise.all([
      this.infrastructureSupervisor.diagnostics(),
      this.#queueStatus(),
      this.#safeCall(() => this.distributedExecutionService.analytics({ workspaceId }), { summary: [], latency: [] }),
      this.#safeCall(() => this.distributedRuntimeService.list({ workspaceId }), []),
    ]);
    const state = { diagnostics, queue, tasks, nodes, capturedAt: new Date().toISOString() };
    const recoveryPlan = {
      postgres: diagnostics.checks?.postgres?.status === "ok" ? "healthy" : "restore database connectivity before replay",
      redis: diagnostics.checks?.redis?.status === "ok" ? "healthy" : "restore queue connectivity before distributed execution",
      websocket: "reconnect clients through /ws and replay buffered events",
    };
    const integrityScore = Number((Number(diagnostics.readinessScore || 0) / 100).toFixed(2));
    const id = randomUUID();
    await this.#persist(
      `insert into production_recovery_checkpoints
       (id, workspace_id, checkpoint_type, state, recovery_plan, integrity_score, created_by, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, now())`,
      [id, workspaceId, checkpointType, state, recoveryPlan, integrityScore, userId || null],
      { workspaceId, eventType: "production.checkpoint.persistence_blocked" }
    );
    await this.#observe({ workspaceId, eventType: "production.checkpoint.created", severity: integrityScore > 0.7 ? "info" : "warning", payload: { id, integrityScore, recoveryPlan } });
    return { id, checkpointType, state, recoveryPlan, integrityScore };
  }

  async recover({ workspaceId, userId }) {
    const infrastructure = await this.infrastructureSupervisor.recover({ runMigrations: true });
    const distributed = await this.#safeCall(() => this.distributedExecutionService.recover({ workspaceId, userId }), { recovered: [], blocked: true });
    const checkpoint = await this.checkpoint({ workspaceId, userId, checkpointType: "post_recovery" });
    await this.#observe({ workspaceId, eventType: "production.recovery.completed", severity: infrastructure.after?.status === "ready" ? "info" : "warning", payload: { distributed, checkpointId: checkpoint.id, infrastructureStatus: infrastructure.after?.status } });
    return { infrastructure, distributed, checkpoint };
  }

  async verify({ workspaceId }) {
    const infrastructure = await this.infrastructureSupervisor.verifyProductionRuntime();
    const queue = await this.#queueStatus();
    const websocket = { status: "configured", endpoint: "/ws" };
    const scaling = await this.#safeCall(() => this.distributedExecutionService.scaling({ workspaceId }), { decision: "blocked", reason: "Persistence unavailable" });
    const status = infrastructure.status === "ready" && queue.status === "ok" ? "ready" : "blocked";
    await this.#observe({ workspaceId, eventType: "production.verification.completed", severity: status === "ready" ? "info" : "warning", payload: { status, queue, infrastructure: infrastructure.status } });
    return { status, infrastructure, queue, websocket, scaling, verifiedAt: new Date().toISOString() };
  }

  async hardenSecurity({ workspaceId, userId, auditType = "production_governance" }) {
    const diagnostics = await this.infrastructureSupervisor.diagnostics();
    const findings = [
      { control: "websocket", status: "configured", endpoint: "/ws" },
      { control: "postgres", status: diagnostics.checks?.postgres?.status || "unknown" },
      { control: "redis", status: diagnostics.checks?.redis?.status || "unknown" },
      { control: "persistence", status: diagnostics.checks?.persistence?.status || "unknown" },
      { control: "rate_limit", status: "configured" },
    ];
    const healthy = findings.filter((finding) => ["ok", "configured"].includes(finding.status)).length;
    const trustScore = Number((healthy / findings.length).toFixed(2));
    const enforcementState = trustScore >= 0.8 ? "enforced" : "degraded";
    const id = randomUUID();
    await this.#persist(
      `insert into production_security_governance_audits
       (id, workspace_id, audit_type, findings, trust_score, enforcement_state, created_by, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, now())`,
      [id, workspaceId, auditType, JSON.stringify(findings), trustScore, enforcementState, userId || null],
      { workspaceId, eventType: "production.security.persistence_blocked" }
    );
    await this.#observe({ workspaceId, eventType: "production.security.audit.completed", severity: enforcementState === "enforced" ? "info" : "warning", payload: { id, trustScore, enforcementState } });
    return { id, findings, trustScore, enforcementState };
  }

  async scaling({ workspaceId }) {
    const decision = await this.#safeCall(() => this.distributedExecutionService.scaling({ workspaceId }), { decision: "blocked", reason: "Persistence unavailable", metrics: {} });
    const queue = await this.#queueStatus();
    await this.#observe({ workspaceId, eventType: "production.scaling.evaluated", severity: decision.decision === "blocked" ? "warning" : "info", payload: { decision, queue } });
    return { decision, queue };
  }

  async lifecycle({ workspaceId, userId, serviceName, action }) {
    const allowedServices = new Set(["postgres", "redis", "infrastructure"]);
    const allowedActions = new Set(["status", "start", "stop", "restart"]);
    if (!allowedServices.has(serviceName)) throw new Error(`Unsupported infrastructure service: ${serviceName}`);
    if (!allowedActions.has(action)) throw new Error(`Unsupported lifecycle action: ${action}`);

    const before = await this.infrastructureSupervisor.diagnostics();
    const id = randomUUID();
    let status = "observed";
    let commandOutput = "";

    if (action === "status") {
      status = this.#serviceStatus(before, serviceName);
    } else if (!before.checks?.docker?.available) {
      status = "blocked";
      commandOutput = "Docker CLI is not available. Install Docker Desktop or start managed PostgreSQL/Redis services.";
    } else {
      const services = serviceName === "infrastructure" ? ["postgres", "redis"] : [serviceName];
      const dockerArgs = action === "start"
        ? ["compose", "up", "-d", ...services]
        : action === "stop"
          ? ["compose", "stop", ...services]
          : ["compose", "restart", ...services];
      const command = await this.#runCommand("docker", dockerArgs);
      status = command.status;
      commandOutput = command.output || command.error || "";
    }

    const after = await this.infrastructureSupervisor.diagnostics();
    await this.#persist(
      `insert into production_lifecycle_actions
       (id, workspace_id, service_name, action, status, command_output, diagnostics, created_by, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
      [id, workspaceId, serviceName, action, status, commandOutput, { before, after }, userId || null],
      { workspaceId, eventType: "production.lifecycle.persistence_blocked" }
    );
    await this.#observe({ workspaceId, eventType: "production.lifecycle.completed", severity: status === "ok" || status === "observed" ? "info" : "warning", payload: { id, serviceName, action, status } });
    return { id, serviceName, action, status, commandOutput, before, after };
  }

  async metrics({ workspaceId }) {
    const [nodes, taskAnalytics, queue, telemetry] = await Promise.all([
      this.#safeCall(() => this.distributedRuntimeService.list({ workspaceId }), []),
      this.#safeCall(() => this.distributedExecutionService.analytics({ workspaceId }), { summary: [], latency: [] }),
      this.#queueStatus(),
      this.#safeCall(() => this.runtimeTelemetryService.summary({ workspaceId }), []),
    ]);
    const scheduled = taskAnalytics.summary?.find((item) => item.status === "scheduled")?.count || 0;
    const running = taskAnalytics.summary?.find((item) => item.status === "running")?.count || 0;
    const failed = taskAnalytics.summary?.find((item) => item.status === "failed_isolated")?.count || 0;
    const onlineNodes = nodes.filter((node) => node.status === "online").length;
    const avgLoad = nodes.length ? nodes.reduce((sum, node) => sum + Number(node.load_score || 0), 0) / nodes.length : 0;
    return {
      nodes,
      taskAnalytics,
      queue,
      telemetry,
      summary: {
        onlineNodes,
        scheduled,
        running,
        failed,
        avgLoad: Number(avgLoad.toFixed(2)),
        routingMode: queue.status === "ok" ? "distributed_queue" : "degraded_direct",
      },
    };
  }

  async coordinate({ workspaceId, userId, objective = "Coordinate production worker scheduling" }) {
    const metrics = await this.metrics({ workspaceId });
    const decision = metrics.summary.scheduled > metrics.summary.onlineNodes * 3
      ? "scale_out"
      : metrics.summary.failed > 0
        ? "isolate_and_recover"
        : metrics.queue.status !== "ok"
          ? "degraded_queue_guard"
          : "hold";
    const reason = decision === "scale_out"
      ? "Scheduled work exceeds current online node capacity."
      : decision === "isolate_and_recover"
        ? "Failed tasks require recovery isolation."
        : decision === "degraded_queue_guard"
          ? "Redis queue is unavailable, routing must stay conservative."
          : "Runtime load is currently balanced.";
    const id = randomUUID();
    await this.#persist(
      `insert into production_orchestration_decisions
       (id, workspace_id, decision_type, decision, reason, metrics, created_by, created_at)
       values ($1, $2, 'runtime_coordination', $3, $4, $5, $6, now())`,
      [id, workspaceId, decision, reason, metrics, userId || null],
      { workspaceId, eventType: "production.orchestration.persistence_blocked" }
    );
    await this.#observe({ workspaceId, eventType: "production.orchestration.coordinated", severity: decision === "hold" ? "info" : "warning", payload: { id, objective, decision, reason } });
    return { id, objective, decision, reason, metrics };
  }

  async scheduleWorkerTask({ workspaceId, userId, taskType = "telemetry_record", requiredCapability, priority = 5, payload = {} }) {
    const taskPayload = taskType === "telemetry_record"
      ? { metric: payload.metric || "production.worker.heartbeat", value: payload.value ?? 1, unit: payload.unit || "event", metadata: payload.metadata || { source: "production-orchestration" } }
      : payload;
    const task = await this.distributedExecutionService.schedule({
      workspaceId,
      userId,
      source: "production_orchestration",
      taskType,
      requiredCapability,
      priority,
      payload: taskPayload,
      maxAttempts: 3,
    });
    await this.#observe({ workspaceId, eventType: "production.worker.task.scheduled", severity: "info", payload: { taskId: task.id, taskType } });
    return { task };
  }

  async #queueStatus() {
    if (!this.redis) return { status: "not_configured", ping: null };
    try {
      const startedAt = Date.now();
      const ping = await this.redis.ping();
      return { status: ping === "PONG" ? "ok" : "degraded", ping, latencyMs: Date.now() - startedAt };
    } catch (error) {
      return { status: "down", error: this.#errorMessage(error) };
    }
  }

  #serviceStatus(diagnostics, serviceName) {
    if (serviceName === "postgres") return diagnostics.checks?.postgres?.status || "unknown";
    if (serviceName === "redis") return diagnostics.checks?.redis?.status || "unknown";
    return diagnostics.status || "unknown";
  }

  #dependencyGraph(diagnostics, queue) {
    return {
      nodes: [
        { id: "docker", label: "Docker", status: diagnostics.checks?.docker?.available ? "available" : "missing" },
        { id: "postgres", label: "PostgreSQL", status: diagnostics.checks?.postgres?.status || "unknown" },
        { id: "redis", label: "Redis", status: diagnostics.checks?.redis?.status || queue.status || "unknown" },
        { id: "migrations", label: "Migrations", status: diagnostics.checks?.migrations?.status || "unknown" },
        { id: "persistence", label: "Persistence", status: diagnostics.checks?.persistence?.status || "unknown" },
        { id: "queues", label: "Distributed Queues", status: queue.status || "unknown" },
        { id: "websocket", label: "WebSocket", status: diagnostics.checks?.websocket?.status || "unknown" },
      ],
      edges: [
        ["docker", "postgres"],
        ["docker", "redis"],
        ["postgres", "migrations"],
        ["migrations", "persistence"],
        ["redis", "queues"],
        ["persistence", "websocket"],
      ].map(([source, target]) => ({ source, target })),
    };
  }

  async #runCommand(command, args) {
    try {
      const { stdout, stderr } = await execFileAsync(command, args, { cwd: process.cwd().replace(/\\backend$/, ""), timeout: 120000, windowsHide: true });
      return { status: "ok", output: (stdout || stderr).trim() };
    } catch (error) {
      return { status: "failed", error: this.#errorMessage(error) };
    }
  }

  async #observe({ workspaceId, eventType, severity = "info", payload = {} }) {
    await this.#persist(
      "insert into production_observability_events (id, workspace_id, event_type, payload, severity, created_at) values ($1, $2, $3, $4, $5, now())",
      [randomUUID(), workspaceId, eventType, payload, severity],
      null
    );
    await this.eventBus?.publish?.({ workspaceId, channel: `workspace:${workspaceId}`, type: eventType, payload });
  }

  async #recordTelemetry({ workspaceId, metric, value, unit, metadata = {} }) {
    try {
      await this.runtimeTelemetryService?.record?.({ workspaceId, metric, value, unit, metadata });
    } catch {
      await this.eventBus?.publish?.({ workspaceId, channel: `workspace:${workspaceId}`, type: "production.telemetry.buffered", payload: { metric, value } });
    }
  }

  async #persist(sql, params, fallbackEvent) {
    if (!this.pool) {
      if (fallbackEvent) await this.eventBus?.publish?.({ workspaceId: fallbackEvent.workspaceId, channel: `workspace:${fallbackEvent.workspaceId}`, type: fallbackEvent.eventType, payload: { reason: "DATABASE_URL missing" } });
      return { status: "blocked", error: "DATABASE_URL missing" };
    }
    try {
      await this.pool.query(sql, params);
      return { status: "ok" };
    } catch (error) {
      if (fallbackEvent) await this.eventBus?.publish?.({ workspaceId: fallbackEvent.workspaceId, channel: `workspace:${fallbackEvent.workspaceId}`, type: fallbackEvent.eventType, payload: { error: this.#errorMessage(error) } });
      return { status: "blocked", error: this.#errorMessage(error) };
    }
  }

  async #safeQuery(sql, params) {
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
    } catch {
      return fallback;
    }
  }

  #errorMessage(error) {
    if (error?.message) return error.message;
    if (Array.isArray(error?.errors) && error.errors.length) return error.errors.map((item) => item.message || item.code).filter(Boolean).join("; ");
    return String(error);
  }
}
