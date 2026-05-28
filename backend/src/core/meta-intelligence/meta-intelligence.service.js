import { randomUUID } from "node:crypto";

export class MetaIntelligenceService {
  constructor({ pool, eventBus, civilizationNetworkService, agiFederationService, infrastructureSupervisor, runtimeTelemetryService }) {
    this.pool = pool;
    this.eventBus = eventBus;
    this.civilizationNetworkService = civilizationNetworkService;
    this.agiFederationService = agiFederationService;
    this.infrastructureSupervisor = infrastructureSupervisor;
    this.runtimeTelemetryService = runtimeTelemetryService;
  }

  async createCore({ workspaceId, userId, civilizationId, federationId, name, objective }) {
    this.#requirePool();
    if (!workspaceId || !name || !objective) throw new Error("workspaceId, name, and objective are required.");
    const id = randomUUID();
    const selfModel = { civilizationId: civilizationId || null, federationId: federationId || null, awareness: "runtime_dependency_bound" };
    const abstractionLayers = ["infrastructure", "federation", "civilization", "cognition", "governance", "economy", "research"];
    await this.pool.query(
      `insert into meta_intelligence_cores
       (id, workspace_id, civilization_id, federation_id, name, objective, self_model, abstraction_layers, created_by, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now())`,
      [id, workspaceId, civilizationId || null, federationId || null, name, objective, selfModel, JSON.stringify(abstractionLayers), userId || null]
    );
    await this.#observe({ workspaceId, metaCoreId: id, eventType: "meta.core.created", payload: { name, objective } });
    return this.getCore({ workspaceId, metaCoreId: id });
  }

  async reflect({ workspaceId, metaCoreId, cycleType = "recursive_self_awareness" }) {
    this.#requirePool();
    const core = await this.getCore({ workspaceId, metaCoreId });
    const [infrastructure, federation, civilization] = await Promise.all([
      this.infrastructureSupervisor?.diagnostics?.(),
      core.federation_id ? this.agiFederationService.topology({ workspaceId, federationId: core.federation_id }) : Promise.resolve({ analytics: {} }),
      core.civilization_id ? this.civilizationNetworkService.observability({ workspaceId, civilizationId: core.civilization_id }) : Promise.resolve({ topology: { analytics: {} } }),
    ]);
    const reflection = {
      infrastructureStatus: infrastructure?.status,
      federation: federation.analytics || {},
      civilization: civilization.topology?.analytics || {},
      bottlenecks: [
        infrastructure?.status !== "ready" ? "infrastructure_dependencies" : null,
        (federation.analytics?.onlineNodes || 0) === 0 ? "federation_node_capacity" : null,
      ].filter(Boolean),
    };
    const recommendations = [
      reflection.infrastructureStatus !== "ready" ? "activate PostgreSQL and Redis before autonomous mutation" : "increase recursive mutation cadence",
      reflection.bottlenecks.includes("federation_node_capacity") ? "register federation coordinator nodes" : "sync cognition memory across federation nodes",
      "record governance decision before kernel mutation",
    ];
    const scoreDelta = reflection.infrastructureStatus === "ready" ? 0.06 : -0.03;
    const id = randomUUID();
    await this.pool.query(
      `insert into meta_reflection_cycles
       (id, workspace_id, meta_core_id, cycle_type, reflection, recommendations, score_delta, status, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, 'completed', now())`,
      [id, workspaceId, metaCoreId, cycleType, reflection, JSON.stringify(recommendations), scoreDelta]
    );
    await this.pool.query(
      "update meta_intelligence_cores set convergence_score = greatest(0, least(1, convergence_score + $3)), self_model = self_model || $4::jsonb, updated_at = now() where id = $1 and workspace_id = $2",
      [metaCoreId, workspaceId, scoreDelta, JSON.stringify({ lastReflectionId: id, lastInfrastructureStatus: reflection.infrastructureStatus })]
    );
    await this.#observe({ workspaceId, metaCoreId, eventType: "meta.reflection.completed", payload: { reflectionId: id, scoreDelta, recommendations } });
    return this.observability({ workspaceId, metaCoreId });
  }

  async registerPlanetaryNode({ workspaceId, metaCoreId, nodeRef, region = "local", capabilities = [], governanceState = {}, intelligenceLoad = 0 }) {
    this.#requirePool();
    await this.getCore({ workspaceId, metaCoreId });
    const id = randomUUID();
    await this.pool.query(
      `insert into planetary_coordination_nodes
       (id, workspace_id, meta_core_id, node_ref, region, capabilities, governance_state, intelligence_load, sync_status, last_sync_at, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'synchronized', now(), now(), now())`,
      [id, workspaceId, metaCoreId, nodeRef, region, capabilities, governanceState, Number(intelligenceLoad)]
    );
    await this.#observe({ workspaceId, metaCoreId, eventType: "planetary.node.synchronized", payload: { nodeId: id, nodeRef, region } });
    return this.planetary({ workspaceId, metaCoreId });
  }

  async proposeRuntimeGenome({ workspaceId, metaCoreId, targetRuntime, mutationType, genome = {}, mutationPlan = {} }) {
    this.#requirePool();
    const infrastructure = await this.infrastructureSupervisor?.diagnostics?.();
    const safetyScore = infrastructure?.status === "ready" ? 0.84 : 0.42;
    const status = safetyScore >= 0.75 ? "validated_for_sandbox" : "blocked_by_infrastructure";
    const id = randomUUID();
    await this.pool.query(
      `insert into runtime_genomes
       (id, workspace_id, meta_core_id, target_runtime, genome, mutation_plan, validation, safety_score, status, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now())`,
      [id, workspaceId, metaCoreId, targetRuntime, genome, mutationPlan, { infrastructureStatus: infrastructure?.status, mutationType }, safetyScore, status]
    );
    await this.#observe({ workspaceId, metaCoreId, eventType: "runtime.genome.proposed", payload: { genomeId: id, status, safetyScore } });
    return this.genomes({ workspaceId, metaCoreId });
  }

  async recordMemory({ workspaceId, metaCoreId, memoryType = "cognition", content, lineage = {}, score = 0.6 }) {
    this.#requirePool();
    const id = randomUUID();
    const compression = { strategy: content?.length > 280 ? "semantic_summary_pending" : "raw", originalLength: content?.length || 0 };
    await this.pool.query(
      `insert into distributed_cognition_memories
       (id, workspace_id, meta_core_id, memory_type, content, lineage, compression, replay_refs, score, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, '[]'::jsonb, $8, now())`,
      [id, workspaceId, metaCoreId, memoryType, content, lineage, compression, Number(score)]
    );
    await this.#observe({ workspaceId, metaCoreId, eventType: "memory.cognition.recorded", payload: { memoryId: id, memoryType, score } });
    return this.memories({ workspaceId, metaCoreId });
  }

  async createEconomyExchange({ workspaceId, metaCoreId, exchangeType = "cognition_workload", contributorRef, consumerRef, valuationCredits = 1, metadata = {} }) {
    this.#requirePool();
    const contributionScore = Math.min(1, Math.max(0, Number(valuationCredits) / 10));
    const id = randomUUID();
    await this.pool.query(
      `insert into intelligence_economy_exchanges
       (id, workspace_id, meta_core_id, exchange_type, contributor_ref, consumer_ref, valuation_credits, contribution_score, metadata, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())`,
      [id, workspaceId, metaCoreId, exchangeType, contributorRef, consumerRef || null, Number(valuationCredits), contributionScore, metadata]
    );
    await this.#observe({ workspaceId, metaCoreId, eventType: "economy.exchange.created", payload: { exchangeId: id, valuationCredits, contributionScore } });
    return this.economy({ workspaceId, metaCoreId });
  }

  async startResearch({ workspaceId, metaCoreId, userId, hypothesis }) {
    this.#requirePool();
    const id = randomUUID();
    const experimentPlan = { steps: ["reflect", "compare federation topology", "record memory", "score governance risk"], generatedAt: new Date().toISOString() };
    const discoveries = [{ type: "infrastructure_signal", finding: "research confidence is bounded by database and queue availability" }];
    await this.pool.query(
      `insert into autonomous_research_programs
       (id, workspace_id, meta_core_id, hypothesis, experiment_plan, discoveries, confidence, status, created_by, created_at, completed_at)
       values ($1, $2, $3, $4, $5, $6, 0.62, 'completed', $7, now(), now())`,
      [id, workspaceId, metaCoreId, hypothesis, experimentPlan, JSON.stringify(discoveries), userId || null]
    );
    await this.#observe({ workspaceId, metaCoreId, eventType: "research.program.completed", payload: { researchId: id, confidence: 0.62 } });
    return this.research({ workspaceId, metaCoreId });
  }

  async topology({ workspaceId, metaCoreId }) {
    this.#requirePool();
    const cores = metaCoreId ? [await this.getCore({ workspaceId, metaCoreId })] : await this.listCores({ workspaceId });
    const ids = cores.map((core) => core.id);
    if (ids.length === 0) return { cores: [], planetaryNodes: [], genomes: [], memories: [], economy: [], research: [], analytics: this.#analytics({ cores: [] }) };
    const [planetaryNodes, genomes, memories, economy, research] = await Promise.all([
      this.pool.query("select * from planetary_coordination_nodes where workspace_id = $1 and meta_core_id = any($2) order by intelligence_load asc, last_sync_at desc nulls last", [workspaceId, ids]),
      this.pool.query("select * from runtime_genomes where workspace_id = $1 and meta_core_id = any($2) order by safety_score desc, created_at desc limit 50", [workspaceId, ids]),
      this.pool.query("select * from distributed_cognition_memories where workspace_id = $1 and meta_core_id = any($2) order by score desc, created_at desc limit 50", [workspaceId, ids]),
      this.pool.query("select * from intelligence_economy_exchanges where workspace_id = $1 and meta_core_id = any($2) order by contribution_score desc, created_at desc limit 50", [workspaceId, ids]),
      this.pool.query("select * from autonomous_research_programs where workspace_id = $1 and meta_core_id = any($2) order by confidence desc, created_at desc limit 50", [workspaceId, ids]),
    ]);
    return { cores, planetaryNodes: planetaryNodes.rows, genomes: genomes.rows, memories: memories.rows, economy: economy.rows, research: research.rows, analytics: this.#analytics({ cores, planetaryNodes: planetaryNodes.rows, genomes: genomes.rows, memories: memories.rows, economy: economy.rows, research: research.rows }) };
  }

  async observability({ workspaceId, metaCoreId }) {
    this.#requirePool();
    const topology = await this.topology({ workspaceId, metaCoreId });
    const events = await this.pool.query(
      "select * from hyper_observability_events where workspace_id = $1 and ($2::text is null or meta_core_id = $2) order by created_at desc limit 100",
      [workspaceId, metaCoreId || null]
    );
    return { ...topology, events: events.rows, heatmap: this.#heatmap({ topology, events: events.rows }) };
  }

  async listCores({ workspaceId, limit = 20 }) {
    const result = await this.pool.query("select * from meta_intelligence_cores where workspace_id = $1 order by convergence_score desc, created_at desc limit $2", [workspaceId, limit]);
    return result.rows;
  }

  async getCore({ workspaceId, metaCoreId }) {
    const result = await this.pool.query("select * from meta_intelligence_cores where id = $1 and workspace_id = $2", [metaCoreId, workspaceId]);
    if (!result.rows[0]) throw new Error("Meta-intelligence core not found.");
    return result.rows[0];
  }

  async planetary({ workspaceId, metaCoreId }) {
    const result = await this.pool.query("select * from planetary_coordination_nodes where workspace_id = $1 and meta_core_id = $2 order by intelligence_load asc", [workspaceId, metaCoreId]);
    return { nodes: result.rows };
  }

  async genomes({ workspaceId, metaCoreId }) {
    const result = await this.pool.query("select * from runtime_genomes where workspace_id = $1 and meta_core_id = $2 order by created_at desc limit 50", [workspaceId, metaCoreId]);
    return { genomes: result.rows };
  }

  async memories({ workspaceId, metaCoreId }) {
    const result = await this.pool.query("select * from distributed_cognition_memories where workspace_id = $1 and meta_core_id = $2 order by score desc, created_at desc limit 50", [workspaceId, metaCoreId]);
    return { memories: result.rows };
  }

  async economy({ workspaceId, metaCoreId }) {
    const result = await this.pool.query("select * from intelligence_economy_exchanges where workspace_id = $1 and meta_core_id = $2 order by created_at desc limit 50", [workspaceId, metaCoreId]);
    return { exchanges: result.rows };
  }

  async research({ workspaceId, metaCoreId }) {
    const result = await this.pool.query("select * from autonomous_research_programs where workspace_id = $1 and meta_core_id = $2 order by created_at desc limit 50", [workspaceId, metaCoreId]);
    return { programs: result.rows };
  }

  async #observe({ workspaceId, metaCoreId, eventType, payload = {} }) {
    const heat = eventType.includes("mutation") ? 0.7 : eventType.includes("reflection") ? 0.5 : 0.3;
    const anomalyScore = payload.status === "blocked_by_infrastructure" ? 0.8 : 0;
    await this.pool.query(
      `insert into hyper_observability_events
       (id, workspace_id, meta_core_id, event_type, payload, heat, anomaly_score, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, now())`,
      [randomUUID(), workspaceId, metaCoreId || null, eventType, payload, heat, anomalyScore]
    );
    await this.eventBus?.publish?.({ workspaceId, channel: `workspace:${workspaceId}`, type: eventType, payload: { metaCoreId, ...payload } });
    try {
      await this.runtimeTelemetryService?.record?.({ workspaceId, metric: `meta.${eventType}`, value: 1, unit: "event", metadata: { metaCoreId } });
    } catch {
      await this.eventBus?.publish?.({ workspaceId, channel: `workspace:${workspaceId}`, type: "meta.telemetry.buffered", payload: { eventType } });
    }
  }

  #analytics({ cores = [], planetaryNodes = [], genomes = [], memories = [], economy = [], research = [] }) {
    return {
      cores: cores.length,
      avgConvergence: cores.length ? Number((cores.reduce((sum, core) => sum + Number(core.convergence_score || 0), 0) / cores.length).toFixed(2)) : 0,
      planetaryNodes: planetaryNodes.length,
      genomes: genomes.length,
      memories: memories.length,
      economyExchanges: economy.length,
      researchPrograms: research.length,
    };
  }

  #heatmap({ topology, events }) {
    return topology.cores.map((core) => ({
      id: core.id,
      label: core.name,
      convergence: Number(core.convergence_score || 0),
      heat: Number(events.filter((event) => event.meta_core_id === core.id).reduce((sum, event) => sum + Number(event.heat || 0), 0).toFixed(2)),
      anomalies: events.filter((event) => event.meta_core_id === core.id && Number(event.anomaly_score || 0) > 0.5).length,
    }));
  }

  #requirePool() {
    if (!this.pool) throw new Error("Meta-intelligence runtime requires PostgreSQL DATABASE_URL.");
  }
}
