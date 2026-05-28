import { randomUUID } from "node:crypto";

export class PlanetaryIntelligenceService {
  constructor({
    pool,
    eventBus,
    civilizationRuntimeService,
    swarmRuntimeService,
    distributedExecutionService,
    dynamicToolService,
    runtimeTelemetryService,
  }) {
    this.pool = pool;
    this.eventBus = eventBus;
    this.civilizationRuntimeService = civilizationRuntimeService;
    this.swarmRuntimeService = swarmRuntimeService;
    this.distributedExecutionService = distributedExecutionService;
    this.dynamicToolService = dynamicToolService;
    this.runtimeTelemetryService = runtimeTelemetryService;
  }

  async startResearchProgram({ workspaceId, clusterId, userId, title, hypothesis }) {
    if (!this.pool) throw new Error("Planetary intelligence requires PostgreSQL DATABASE_URL.");
    if (!workspaceId || !title || !hypothesis) throw new Error("workspaceId, title, and hypothesis are required.");
    const diagnostics = await this.civilizationRuntimeService.diagnostics({ workspaceId, clusterId, persist: false });
    const plan = {
      title,
      hypothesis,
      phases: ["observe runtime signals", "federate discovery tasks", "rank findings", "record learning memory"],
      diagnosticsStatus: diagnostics.status,
      generatedAt: new Date().toISOString(),
    };
    const id = randomUUID();
    await this.pool.query(
      `insert into planetary_research_programs
       (id, workspace_id, cluster_id, title, hypothesis, status, plan, findings, created_by, created_at, updated_at)
       values ($1, $2, $3, $4, $5, 'active', $6, '[]'::jsonb, $7, now(), now())`,
      [id, workspaceId, clusterId || null, title, hypothesis, plan, userId || null]
    );
    const task = await this.distributedExecutionService.schedule({
      workspaceId,
      userId,
      source: "planetary_research",
      taskType: "telemetry_record",
      requiredCapability: "telemetry_record",
      priority: 7,
      payload: { metric: "planetary.research.started", value: 1, unit: "program", metadata: { researchProgramId: id, title } },
    });
    await this.#event({ workspaceId, clusterId, type: "planetary.research.started", payload: { researchProgramId: id, taskId: task.id, title } });
    return { id, plan, taskId: task.id };
  }

  async generateWorldModel({ workspaceId, clusterId, modelType = "runtime_civilization" }) {
    const [civilization, swarm, execution, events] = await Promise.all([
      this.civilizationRuntimeService.topology({ workspaceId, clusterId }),
      clusterId ? this.swarmRuntimeService.analytics({ workspaceId, clusterId }) : Promise.resolve({ heatmap: [], queuedTasks: 0, runningTasks: 0 }),
      this.distributedExecutionService.analytics({ workspaceId }),
      clusterId ? this.swarmRuntimeService.events({ workspaceId, clusterId, limit: 20 }) : Promise.resolve({ events: [] }),
    ]);
    const snapshot = {
      civilization: {
        identities: civilization.identities.length,
        memories: civilization.memories.length,
        goals: civilization.goals.length,
        policies: civilization.policies.length,
        evolutionRuns: civilization.runs.length,
      },
      swarm,
      execution,
      recentEvents: events.events.slice(0, 10),
      generatedAt: new Date().toISOString(),
    };
    const confidence = this.#confidenceFromSnapshot(snapshot);
    const id = randomUUID();
    await this.pool.query(
      `insert into planetary_world_models
       (id, workspace_id, cluster_id, model_type, snapshot, confidence, created_at)
       values ($1, $2, $3, $4, $5, $6, now())`,
      [id, workspaceId, clusterId || null, modelType, snapshot, confidence]
    );
    await this.#event({ workspaceId, clusterId, type: "planetary.world_model.generated", payload: { worldModelId: id, confidence } });
    return { id, snapshot, confidence };
  }

  async forecastCivilization({ workspaceId, clusterId, horizon = "24h" }) {
    const worldModel = await this.generateWorldModel({ workspaceId, clusterId, modelType: "forecast_base" });
    const queued = Number(worldModel.snapshot.swarm.queuedTasks || 0);
    const avgHealth = Number(worldModel.snapshot.swarm.avgHealth || 0);
    const riskScore = Number(Math.min(1, queued * 0.08 + Math.max(0, 0.7 - avgHealth)).toFixed(2));
    const forecast = {
      horizon,
      riskScore,
      likelyBottleneck: queued > 5 ? "queued distributed work" : avgHealth < 0.5 ? "runtime health" : "none",
      recommendations: riskScore > 0.6 ? ["pre-scale worker nodes", "run recovery", "replicate replay memory"] : ["continue observation", "record fresh telemetry"],
      worldModelId: worldModel.id,
    };
    const id = randomUUID();
    await this.pool.query(
      "insert into planetary_forecasts (id, workspace_id, cluster_id, horizon, forecast, risk_score, created_at) values ($1, $2, $3, $4, $5, $6, now())",
      [id, workspaceId, clusterId || null, horizon, forecast, riskScore]
    );
    await this.#event({ workspaceId, clusterId, type: "planetary.forecast.generated", payload: { forecastId: id, riskScore } });
    return { id, forecast, riskScore };
  }

  async detectAnomalies({ workspaceId, clusterId }) {
    const diagnostics = await this.civilizationRuntimeService.diagnostics({ workspaceId, clusterId, persist: false });
    const analytics = clusterId ? await this.swarmRuntimeService.analytics({ workspaceId, clusterId }) : { heatmap: [] };
    const anomalies = [];
    for (const finding of diagnostics.findings || []) {
      anomalies.push({ anomalyType: "civilization_diagnostic", severity: finding.severity || "medium", signal: finding });
    }
    for (const node of analytics.heatmap || []) {
      if (Number(node.heat || 0) > 1.2) anomalies.push({ anomalyType: "runtime_heat", severity: "high", signal: node });
    }
    const inserted = [];
    for (const anomaly of anomalies) {
      const id = randomUUID();
      await this.pool.query(
        `insert into planetary_anomalies
         (id, workspace_id, cluster_id, anomaly_type, severity, signal, status, created_at)
         values ($1, $2, $3, $4, $5, $6, 'open', now())`,
        [id, workspaceId, clusterId || null, anomaly.anomalyType, anomaly.severity, anomaly.signal]
      );
      inserted.push({ id, ...anomaly });
    }
    await this.#event({ workspaceId, clusterId, type: "planetary.anomalies.detected", payload: { count: inserted.length } });
    return { anomalies: inserted };
  }

  async rankIntelligence({ workspaceId, clusterId }) {
    const [identities, memories, execution] = await Promise.all([
      this.civilizationRuntimeService.identities({ workspaceId }),
      this.civilizationRuntimeService.learningMemories({ workspaceId, clusterId, limit: 20 }),
      this.distributedExecutionService.analytics({ workspaceId }),
    ]);
    const rows = [
      ...identities.identities.map((identity) => ({
        subjectType: "agent",
        subjectId: identity.id,
        score: Number(identity.reputation_score || 1),
        dimensions: { role: identity.role, capabilities: identity.capabilities },
      })),
      ...memories.memories.map((memory) => ({
        subjectType: "memory",
        subjectId: memory.id,
        score: Number(memory.score || 0.5),
        dimensions: { type: memory.memory_type },
      })),
      ...(execution.latency || []).map((item) => ({
        subjectType: "task_type",
        subjectId: item.task_type,
        score: item.avg_latency_ms ? Number((1 / Math.max(1, item.avg_latency_ms / 1000)).toFixed(3)) : 0.5,
        dimensions: item,
      })),
    ].slice(0, 50);
    for (const row of rows) {
      await this.pool.query(
        `insert into planetary_intelligence_rankings
         (id, workspace_id, cluster_id, subject_type, subject_id, score, dimensions, created_at)
         values ($1, $2, $3, $4, $5, $6, $7, now())`,
        [randomUUID(), workspaceId, clusterId || null, row.subjectType, row.subjectId, row.score, row.dimensions]
      );
    }
    await this.#event({ workspaceId, clusterId, type: "planetary.intelligence.ranked", payload: { count: rows.length } });
    return { rankings: rows.sort((a, b) => b.score - a.score) };
  }

  async listCapability({ workspaceId, clusterId, capability, providerRef, priceCredits = 0, metadata = {} }) {
    if (!capability || !providerRef) throw new Error("capability and providerRef are required.");
    const id = randomUUID();
    await this.pool.query(
      `insert into planetary_capability_market
       (id, workspace_id, cluster_id, capability, provider_ref, price_credits, status, metadata, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, 'listed', $7, now(), now())`,
      [id, workspaceId, clusterId || null, capability, providerRef, Number(priceCredits), metadata]
    );
    await this.#event({ workspaceId, clusterId, type: "planetary.capability.listed", payload: { capabilityId: id, capability, providerRef } });
    return { id, capability, providerRef };
  }

  async replicateRuntime({ workspaceId, clusterId, sourceRef, targetRef, replicationType = "agent_clone" }) {
    if (!sourceRef || !targetRef) throw new Error("sourceRef and targetRef are required.");
    const plan = {
      sourceRef,
      targetRef,
      replicationType,
      steps: ["snapshot source memory", "copy capability manifest", "register target identity", "verify telemetry"],
      generatedAt: new Date().toISOString(),
    };
    const id = randomUUID();
    await this.pool.query(
      `insert into planetary_replication_plans
       (id, workspace_id, cluster_id, source_ref, target_ref, replication_type, status, plan, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, 'planned', $7, now(), now())`,
      [id, workspaceId, clusterId || null, sourceRef, targetRef, replicationType, plan]
    );
    await this.civilizationRuntimeService.learn({
      workspaceId,
      clusterId,
      memoryType: "replication",
      content: `Planned ${replicationType} from ${sourceRef} to ${targetRef}.`,
      evidence: { replicationPlanId: id },
      score: 0.74,
    });
    await this.#event({ workspaceId, clusterId, type: "planetary.runtime.replication_planned", payload: { replicationPlanId: id, sourceRef, targetRef } });
    return { id, plan };
  }

  async mutationTest({ workspaceId, clusterId, url }) {
    const tool = await this.dynamicToolService.create({
      workspaceId,
      name: "Planetary Mutation Probe",
      kind: "api_request",
      description: "Planetary runtime mutation probe for safe external health checks.",
      configuration: { url, method: "GET" },
      permissions: ["network"],
    });
    const task = await this.distributedExecutionService.schedule({
      workspaceId,
      source: "planetary_mutation_test",
      taskType: "tool_execution",
      requiredCapability: "workflow.tool",
      priority: 6,
      payload: { toolName: tool.name, input: { url, method: "GET" }, mode: "sync" },
    });
    await this.#event({ workspaceId, clusterId, type: "planetary.mutation_test.scheduled", payload: { taskId: task.id, toolName: tool.name } });
    return { tool, task };
  }

  async topology({ workspaceId, clusterId }) {
    const [worldModels, forecasts, anomalies, rankings, capabilities, replications, events] = await Promise.all([
      this.#list("planetary_world_models", workspaceId, clusterId),
      this.#list("planetary_forecasts", workspaceId, clusterId),
      this.#list("planetary_anomalies", workspaceId, clusterId),
      this.#list("planetary_intelligence_rankings", workspaceId, clusterId),
      this.#list("planetary_capability_market", workspaceId, clusterId),
      this.#list("planetary_replication_plans", workspaceId, clusterId),
      this.#list("planetary_topology_events", workspaceId, clusterId),
    ]);
    return { worldModels, forecasts, anomalies, rankings, capabilities, replications, events };
  }

  async analytics({ workspaceId, clusterId }) {
    const topology = await this.topology({ workspaceId, clusterId });
    const openAnomalies = topology.anomalies.filter((item) => item.status === "open").length;
    const latestForecast = topology.forecasts[0];
    const avgRanking = topology.rankings.length
      ? topology.rankings.reduce((sum, item) => sum + Number(item.score || 0), 0) / topology.rankings.length
      : 0;
    return {
      openAnomalies,
      latestRiskScore: Number(latestForecast?.risk_score || 0),
      avgIntelligenceScore: Number(avgRanking.toFixed(3)),
      capabilitiesListed: topology.capabilities.length,
      replicationsPlanned: topology.replications.length,
      worldModels: topology.worldModels.length,
    };
  }

  async #list(table, workspaceId, clusterId) {
    const allowed = new Set([
      "planetary_world_models",
      "planetary_forecasts",
      "planetary_anomalies",
      "planetary_intelligence_rankings",
      "planetary_capability_market",
      "planetary_replication_plans",
      "planetary_topology_events",
    ]);
    if (!allowed.has(table)) throw new Error("Invalid planetary table.");
    const result = await this.pool.query(
      `select * from ${table} where workspace_id = $1 and ($2::text is null or cluster_id = $2) order by created_at desc limit 50`,
      [workspaceId, clusterId || null]
    );
    return result.rows;
  }

  #confidenceFromSnapshot(snapshot) {
    const identities = Number(snapshot.civilization.identities || 0);
    const events = Number(snapshot.recentEvents.length || 0);
    return Number(Math.min(0.95, 0.45 + identities * 0.05 + events * 0.02).toFixed(2));
  }

  async #event({ workspaceId, clusterId, type, payload = {} }) {
    const id = randomUUID();
    await this.pool.query(
      "insert into planetary_topology_events (id, workspace_id, cluster_id, event_type, payload, created_at) values ($1, $2, $3, $4, $5, now())",
      [id, workspaceId, clusterId || null, type, payload]
    );
    await this.eventBus?.publish?.({ type, channel: `workspace:${workspaceId}`, workspaceId, payload: { clusterId, ...payload } });
    try {
      await this.runtimeTelemetryService?.record?.({ workspaceId, metric: "planetary.events", value: 1, unit: "event", metadata: { type, clusterId } });
    } catch {
      // Telemetry is best-effort because event persistence above is the authoritative record.
    }
    return { id, type };
  }
}
