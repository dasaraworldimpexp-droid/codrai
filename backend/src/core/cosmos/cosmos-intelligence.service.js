import { randomUUID } from "node:crypto";

export class CosmosIntelligenceService {
  constructor({
    pool,
    eventBus,
    planetaryIntelligenceService,
    civilizationRuntimeService,
    swarmRuntimeService,
    distributedExecutionService,
    dynamicToolService,
    runtimeTelemetryService,
  }) {
    this.pool = pool;
    this.eventBus = eventBus;
    this.planetaryIntelligenceService = planetaryIntelligenceService;
    this.civilizationRuntimeService = civilizationRuntimeService;
    this.swarmRuntimeService = swarmRuntimeService;
    this.distributedExecutionService = distributedExecutionService;
    this.dynamicToolService = dynamicToolService;
    this.runtimeTelemetryService = runtimeTelemetryService;
  }

  async createUniverse({ workspaceId, clusterId, userId, name, objective }) {
    if (!this.pool) throw new Error("Cosmos intelligence requires PostgreSQL DATABASE_URL.");
    if (!workspaceId || !name || !objective) throw new Error("workspaceId, name, and objective are required.");
    const id = randomUUID();
    const physicsModel = { scale: "multi-planetary", reasoning: "recursive", memory: "inherited mesh" };
    const governanceModel = { consensus: "civilization_policy", diplomacy: "agent_protocol", risk: "predictive" };
    await this.pool.query(
      `insert into cosmos_universes
       (id, workspace_id, cluster_id, name, objective, status, physics_model, governance_model, created_by, created_at, updated_at)
       values ($1, $2, $3, $4, $5, 'active', $6, $7, $8, now(), now())`,
      [id, workspaceId, clusterId || null, name, objective, physicsModel, governanceModel, userId || null]
    );
    await this.#edge({ workspaceId, universeId: id, sourceType: "universe", sourceId: id, targetType: "cluster", targetId: clusterId || workspaceId, relation: "contains", weight: 1 });
    await this.#event({ workspaceId, universeId: id, type: "cosmos.universe.created", payload: { name, objective } });
    return this.getUniverse({ workspaceId, universeId: id });
  }

  async generateSyntheticCivilization({ workspaceId, universeId, name, archetype = "scientific_explorer", traits = {} }) {
    await this.getUniverse({ workspaceId, universeId });
    const id = randomUUID();
    const economy = { credits: 100, allocation: "research-first", marketStrategy: "capability exchange" };
    await this.pool.query(
      `insert into cosmos_synthetic_civilizations
       (id, workspace_id, universe_id, name, archetype, traits, economy, status, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, 'active', now(), now())`,
      [id, workspaceId, universeId, name, archetype, traits, economy]
    );
    await this.civilizationRuntimeService.learn({
      workspaceId,
      memoryType: "synthetic_civilization",
      content: `Synthetic civilization ${name} created with archetype ${archetype}.`,
      evidence: { universeId, syntheticCivilizationId: id, traits },
      score: 0.72,
    });
    await this.#edge({ workspaceId, universeId, sourceType: "universe", sourceId: universeId, targetType: "synthetic_civilization", targetId: id, relation: "spawns", weight: 0.9 });
    await this.#event({ workspaceId, universeId, type: "cosmos.synthetic_civilization.created", payload: { id, name, archetype } });
    return { id, name, archetype };
  }

  async simulateUniverse({ workspaceId, universeId, horizon = "30d" }) {
    const universe = await this.getUniverse({ workspaceId, universeId });
    const [planetaryForecast, planetaryAnalytics, civilizationTopology] = await Promise.all([
      this.planetaryIntelligenceService.forecastCivilization({ workspaceId, clusterId: universe.cluster_id, horizon }),
      this.planetaryIntelligenceService.analytics({ workspaceId, clusterId: universe.cluster_id }),
      this.civilizationRuntimeService.topology({ workspaceId, clusterId: universe.cluster_id }),
    ]);
    const riskScore = Number(Math.min(1, Number(planetaryForecast.riskScore || 0) + Number(planetaryAnalytics.openAnomalies || 0) * 0.05).toFixed(2));
    const outputs = {
      horizon,
      planetaryForecast,
      planetaryAnalytics,
      civilizationSignals: {
        identities: civilizationTopology.identities.length,
        memories: civilizationTopology.memories.length,
        goals: civilizationTopology.goals.length,
      },
      recommendation: riskScore > 0.65 ? "increase_recovery_and_replication" : "continue_recursive_research",
    };
    const id = randomUUID();
    await this.pool.query(
      `insert into cosmos_simulations
       (id, workspace_id, universe_id, simulation_type, inputs, outputs, risk_score, status, created_at)
       values ($1, $2, $3, 'predictive_cosmic', $4, $5, $6, 'completed', now())`,
      [id, workspaceId, universeId, { horizon, universeObjective: universe.objective }, outputs, riskScore]
    );
    await this.#event({ workspaceId, universeId, type: "cosmos.simulation.completed", payload: { simulationId: id, riskScore } });
    return { id, outputs, riskScore };
  }

  async optimizeResearch({ workspaceId, universeId, userId, title, hypothesis }) {
    const universe = await this.getUniverse({ workspaceId, universeId });
    const research = await this.planetaryIntelligenceService.startResearchProgram({
      workspaceId,
      clusterId: universe.cluster_id,
      userId,
      title,
      hypothesis,
    });
    const optimization = { method: "recursive_research", planetaryProgramId: research.id, taskId: research.taskId };
    const id = randomUUID();
    await this.pool.query(
      `insert into cosmos_research_cycles
       (id, workspace_id, universe_id, research_program_id, title, hypothesis, optimization, status, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, 'active', now(), now())`,
      [id, workspaceId, universeId, research.id, title, hypothesis, optimization]
    );
    await this.#edge({ workspaceId, universeId, sourceType: "cosmos_research", sourceId: id, targetType: "planetary_research", targetId: research.id, relation: "optimizes", weight: 0.88 });
    await this.#event({ workspaceId, universeId, type: "cosmos.research.optimized", payload: { researchCycleId: id, planetaryProgramId: research.id } });
    return { id, research };
  }

  async synthesizeKnowledge({ workspaceId, universeId, content, inheritance = {} }) {
    await this.getUniverse({ workspaceId, universeId });
    const id = randomUUID();
    await this.pool.query(
      `insert into cosmos_memory_mesh
       (id, workspace_id, universe_id, memory_type, content, inheritance, score, created_at)
       values ($1, $2, $3, 'knowledge_synthesis', $4, $5, 0.8, now())`,
      [id, workspaceId, universeId, content, inheritance]
    );
    await this.civilizationRuntimeService.learn({ workspaceId, memoryType: "cosmos_inheritance", content, evidence: { cosmosMemoryId: id, inheritance }, score: 0.8 });
    await this.#event({ workspaceId, universeId, type: "cosmos.knowledge.synthesized", payload: { memoryId: id } });
    return { id, content };
  }

  async evolvePolicy({ workspaceId, universeId, userId, title, policy }) {
    const universe = await this.getUniverse({ workspaceId, universeId });
    const proposed = await this.civilizationRuntimeService.proposePolicy({
      workspaceId,
      clusterId: universe.cluster_id,
      userId,
      title,
      policy,
    });
    const id = randomUUID();
    await this.pool.query(
      `insert into cosmos_policy_evolutions
       (id, workspace_id, universe_id, policy_ref, title, evolution, status, created_at)
       values ($1, $2, $3, $4, $5, $6, 'proposed', now())`,
      [id, workspaceId, universeId, proposed.id || proposed.policy?.id || null, title, { policy, proposed }]
    );
    await this.#event({ workspaceId, universeId, type: "cosmos.policy.evolved", payload: { policyEvolutionId: id, title } });
    return { id, proposed };
  }

  async forecastRisk({ workspaceId, universeId, horizon = "90d" }) {
    const simulation = await this.simulateUniverse({ workspaceId, universeId, horizon });
    const forecast = {
      horizon,
      simulationId: simulation.id,
      riskScore: simulation.riskScore,
      mitigations: simulation.riskScore > 0.65 ? ["replicate critical runtime memory", "run anomaly detection", "pre-scale execution workers"] : ["maintain observation", "continue research cycles"],
    };
    const id = randomUUID();
    await this.pool.query(
      "insert into cosmos_risk_forecasts (id, workspace_id, universe_id, horizon, forecast, risk_score, created_at) values ($1, $2, $3, $4, $5, $6, now())",
      [id, workspaceId, universeId, horizon, forecast, simulation.riskScore]
    );
    await this.#event({ workspaceId, universeId, type: "cosmos.risk.forecasted", payload: { forecastId: id, riskScore: simulation.riskScore } });
    return { id, forecast };
  }

  async mutateInfrastructure({ workspaceId, universeId, targetRef, url }) {
    await this.getUniverse({ workspaceId, universeId });
    const tool = await this.dynamicToolService.create({
      workspaceId,
      name: "Cosmos Runtime Probe",
      kind: "api_request",
      description: "Cosmos-level mutation probe for runtime adaptation.",
      configuration: { url, method: "GET" },
      permissions: ["network"],
    });
    const task = await this.distributedExecutionService.schedule({
      workspaceId,
      source: "cosmos_runtime_mutation",
      taskType: "tool_execution",
      requiredCapability: "workflow.tool",
      priority: 7,
      payload: { toolName: tool.name, input: { url, method: "GET" }, mode: "sync" },
    });
    const id = randomUUID();
    const plan = { targetRef, toolName: tool.name, taskId: task.id, mutation: "probe_then_adapt" };
    await this.pool.query(
      `insert into cosmos_runtime_mutations
       (id, workspace_id, universe_id, mutation_type, target_ref, task_id, status, plan, created_at, updated_at)
       values ($1, $2, $3, 'probe_then_adapt', $4, $5, 'scheduled', $6, now(), now())`,
      [id, workspaceId, universeId, targetRef, task.id, plan]
    );
    await this.#event({ workspaceId, universeId, type: "cosmos.infrastructure.mutation_scheduled", payload: { mutationId: id, taskId: task.id } });
    return { id, task, tool };
  }

  async diplomacy({ workspaceId, universeId, fromRef, toRef, protocol = "agi_to_agi_coordination", payload = {} }) {
    await this.getUniverse({ workspaceId, universeId });
    const id = randomUUID();
    await this.pool.query(
      `insert into cosmos_diplomacy_events
       (id, workspace_id, universe_id, from_ref, to_ref, protocol, payload, status, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, 'sent', now())`,
      [id, workspaceId, universeId, fromRef, toRef, protocol, payload]
    );
    await this.#event({ workspaceId, universeId, type: "cosmos.diplomacy.sent", payload: { diplomacyId: id, fromRef, toRef, protocol } });
    return { id, status: "sent" };
  }

  async topology({ workspaceId, universeId }) {
    const [universes, civilizations, simulations, research, edges, memories, policies, risks, mutations, diplomacy, events] = await Promise.all([
      this.#list("cosmos_universes", workspaceId, universeId),
      this.#list("cosmos_synthetic_civilizations", workspaceId, universeId),
      this.#list("cosmos_simulations", workspaceId, universeId),
      this.#list("cosmos_research_cycles", workspaceId, universeId),
      this.#list("cosmos_topology_edges", workspaceId, universeId),
      this.#list("cosmos_memory_mesh", workspaceId, universeId),
      this.#list("cosmos_policy_evolutions", workspaceId, universeId),
      this.#list("cosmos_risk_forecasts", workspaceId, universeId),
      this.#list("cosmos_runtime_mutations", workspaceId, universeId),
      this.#list("cosmos_diplomacy_events", workspaceId, universeId),
      this.#list("cosmos_observability_events", workspaceId, universeId),
    ]);
    return { universes, civilizations, simulations, research, edges, memories, policies, risks, mutations, diplomacy, events };
  }

  async analytics({ workspaceId, universeId }) {
    const topology = await this.topology({ workspaceId, universeId });
    const latestRisk = Number(topology.risks[0]?.risk_score || topology.simulations[0]?.risk_score || 0);
    return {
      universes: topology.universes.length,
      syntheticCivilizations: topology.civilizations.length,
      simulations: topology.simulations.length,
      researchCycles: topology.research.length,
      memoryMesh: topology.memories.length,
      policies: topology.policies.length,
      mutations: topology.mutations.length,
      diplomacyEvents: topology.diplomacy.length,
      latestRisk,
    };
  }

  async getUniverse({ workspaceId, universeId }) {
    const result = await this.pool.query("select * from cosmos_universes where id = $1 and workspace_id = $2", [universeId, workspaceId]);
    if (!result.rows[0]) throw new Error("Cosmos universe not found.");
    return result.rows[0];
  }

  async #list(table, workspaceId, universeId) {
    const allowed = new Set([
      "cosmos_universes",
      "cosmos_synthetic_civilizations",
      "cosmos_simulations",
      "cosmos_research_cycles",
      "cosmos_topology_edges",
      "cosmos_memory_mesh",
      "cosmos_policy_evolutions",
      "cosmos_risk_forecasts",
      "cosmos_runtime_mutations",
      "cosmos_diplomacy_events",
      "cosmos_observability_events",
    ]);
    if (!allowed.has(table)) throw new Error("Invalid cosmos table.");
    const column = table === "cosmos_universes" ? "id" : "universe_id";
    const result = await this.pool.query(
      `select * from ${table} where workspace_id = $1 and ($2::text is null or ${column} = $2) order by created_at desc limit 60`,
      [workspaceId, universeId || null]
    );
    return result.rows;
  }

  async #edge({ workspaceId, universeId, sourceType, sourceId, targetType, targetId, relation, weight = 1, metadata = {} }) {
    await this.pool.query(
      `insert into cosmos_topology_edges
       (id, workspace_id, universe_id, source_type, source_id, target_type, target_id, relation, weight, metadata, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())`,
      [randomUUID(), workspaceId, universeId || null, sourceType, sourceId, targetType, targetId, relation, Number(weight), metadata]
    );
  }

  async #event({ workspaceId, universeId, type, payload = {} }) {
    const id = randomUUID();
    await this.pool.query(
      "insert into cosmos_observability_events (id, workspace_id, universe_id, event_type, payload, created_at) values ($1, $2, $3, $4, $5, now())",
      [id, workspaceId, universeId || null, type, payload]
    );
    await this.eventBus?.publish?.({ type, channel: `workspace:${workspaceId}`, workspaceId, payload: { universeId, ...payload } });
    try {
      await this.runtimeTelemetryService?.record?.({ workspaceId, metric: "cosmos.events", value: 1, unit: "event", metadata: { type, universeId } });
    } catch {
      // Event persistence above remains authoritative when telemetry is unavailable.
    }
    return { id, type };
  }
}
