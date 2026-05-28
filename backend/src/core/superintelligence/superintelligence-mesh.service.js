import { randomUUID } from "node:crypto";

export class SuperintelligenceMeshService {
  constructor({ pool, eventBus, metaIntelligenceService, infrastructureSupervisor, runtimeTelemetryService }) {
    this.pool = pool;
    this.eventBus = eventBus;
    this.metaIntelligenceService = metaIntelligenceService;
    this.infrastructureSupervisor = infrastructureSupervisor;
    this.runtimeTelemetryService = runtimeTelemetryService;
  }

  async createMesh({ workspaceId, userId, metaCoreId, name, objective }) {
    this.#requirePool();
    if (!workspaceId || !name || !objective) throw new Error("workspaceId, name, and objective are required.");
    const id = randomUUID();
    const selfAwarenessGraph = { metaCoreId: metaCoreId || null, layers: ["mesh", "species", "science", "planetary", "simulation", "governance", "memory", "economy"] };
    await this.pool.query(
      `insert into superintelligence_meshes
       (id, workspace_id, meta_core_id, name, objective, self_awareness_graph, created_by, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, now(), now())`,
      [id, workspaceId, metaCoreId || null, name, objective, selfAwarenessGraph, userId || null]
    );
    await this.#observe({ workspaceId, meshId: id, eventType: "super.mesh.created", payload: { name, objective } });
    return this.getMesh({ workspaceId, meshId: id });
  }

  async fuseCognition({ workspaceId, meshId }) {
    this.#requirePool();
    const mesh = await this.getMesh({ workspaceId, meshId });
    const infrastructure = await this.infrastructureSupervisor?.diagnostics?.();
    const meta = mesh.meta_core_id ? await this.metaIntelligenceService.observability({ workspaceId, metaCoreId: mesh.meta_core_id }) : { analytics: {} };
    const delta = infrastructure?.status === "ready" ? 0.08 : -0.02;
    const amplification = Math.max(0, Math.min(1, Number((Number(mesh.amplification_score || 0.5) + delta + ((meta.analytics?.avgConvergence || 0) * 0.02)).toFixed(2))));
    const convergence = Math.max(0, Math.min(1, Number((Number(mesh.convergence_score || 0.5) + delta).toFixed(2))));
    await this.pool.query(
      `update superintelligence_meshes
       set amplification_score = $3, convergence_score = $4,
           self_awareness_graph = self_awareness_graph || $5::jsonb,
           updated_at = now()
       where id = $1 and workspace_id = $2`,
      [meshId, workspaceId, amplification, convergence, JSON.stringify({ lastFusionAt: new Date().toISOString(), infrastructureStatus: infrastructure?.status })]
    );
    await this.#observe({ workspaceId, meshId, eventType: "super.cognition.fused", payload: { amplification, convergence, infrastructureStatus: infrastructure?.status } });
    return this.observability({ workspaceId, meshId });
  }

  async generateSpecies({ workspaceId, meshId, speciesName, archetype = "coordinator", genome = {}, inheritance = {} }) {
    this.#requirePool();
    await this.getMesh({ workspaceId, meshId });
    const id = randomUUID();
    const fitnessScore = this.#scoreFromObject(genome, 0.55);
    await this.pool.query(
      `insert into synthetic_intelligence_species
       (id, workspace_id, mesh_id, species_name, archetype, genome, inheritance, lifecycle_state, fitness_score, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, 'evolving', $8, now(), now())`,
      [id, workspaceId, meshId, speciesName, archetype, genome, inheritance, fitnessScore]
    );
    await this.#observe({ workspaceId, meshId, eventType: "species.generated", payload: { speciesId: id, speciesName, fitnessScore } });
    return this.species({ workspaceId, meshId });
  }

  async runScience({ workspaceId, meshId, userId, hypothesis }) {
    this.#requirePool();
    await this.getMesh({ workspaceId, meshId });
    const id = randomUUID();
    const theoremCandidate = `If ${hypothesis}, then mesh convergence should improve under explicit infrastructure feedback.`;
    const discoveries = [{ signal: "infrastructure_readiness_bounds_autonomy", confidence: 0.68 }];
    await this.pool.query(
      `insert into recursive_science_programs
       (id, workspace_id, mesh_id, hypothesis, theorem_candidate, experiment, discoveries, confidence, status, created_by, created_at, completed_at)
       values ($1, $2, $3, $4, $5, $6, $7, 0.68, 'completed', $8, now(), now())`,
      [id, workspaceId, meshId, hypothesis, theoremCandidate, { method: "diagnostic_comparison" }, JSON.stringify(discoveries), userId || null]
    );
    await this.#observe({ workspaceId, meshId, eventType: "science.discovery.completed", payload: { scienceId: id, confidence: 0.68 } });
    return this.science({ workspaceId, meshId });
  }

  async routeInterplanetaryCognition({ workspaceId, meshId, sourceRef, targetRef, routeType = "cognition_sync", bandwidthScore = 0.5 }) {
    this.#requirePool();
    await this.getMesh({ workspaceId, meshId });
    const id = randomUUID();
    await this.pool.query(
      `insert into interplanetary_cognition_routes
       (id, workspace_id, mesh_id, source_ref, target_ref, route_type, bandwidth_score, sync_state, telemetry, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, 'active', $8, now())`,
      [id, workspaceId, meshId, sourceRef, targetRef, routeType, Number(bandwidthScore), { latencyClass: "local", routeType }]
    );
    await this.#observe({ workspaceId, meshId, eventType: "interplanetary.route.active", payload: { routeId: id, sourceRef, targetRef } });
    return this.routes({ workspaceId, meshId });
  }

  async simulateWorld({ workspaceId, meshId, worldName, scenario }) {
    this.#requirePool();
    await this.getMesh({ workspaceId, meshId });
    const id = randomUUID();
    const divergenceScore = scenario?.toLowerCase?.().includes("failure") ? 0.72 : 0.34;
    await this.pool.query(
      `insert into recursive_world_simulations
       (id, workspace_id, mesh_id, world_name, scenario, simulation_state, anomaly_forecast, divergence_score, status, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'simulated', now())`,
      [id, workspaceId, meshId, worldName, scenario, { phase: "simulated", economy: "bounded" }, { likelyAnomaly: "dependency_gap", probability: divergenceScore }, divergenceScore]
    );
    await this.#observe({ workspaceId, meshId, eventType: "world.simulation.completed", payload: { simulationId: id, divergenceScore } });
    return this.simulations({ workspaceId, meshId });
  }

  async govern({ workspaceId, meshId, userId, lawRef, policy = {} }) {
    this.#requirePool();
    const infrastructure = await this.infrastructureSupervisor?.diagnostics?.();
    const trustScore = infrastructure?.status === "ready" ? 0.88 : 0.52;
    const complianceState = trustScore >= 0.8 ? "active" : "limited_by_infrastructure";
    const id = randomUUID();
    await this.pool.query(
      `insert into super_governance_laws
       (id, workspace_id, mesh_id, law_ref, policy, trust_score, compliance_state, created_by, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
      [id, workspaceId, meshId, lawRef, policy, trustScore, complianceState, userId || null]
    );
    await this.#observe({ workspaceId, meshId, eventType: "super.governance.law.recorded", payload: { lawId: id, trustScore, complianceState } });
    return this.governance({ workspaceId, meshId });
  }

  async archiveMemory({ workspaceId, meshId, ancestorRef, descendantRef, memoryType = "cognition_lineage", archive = {} }) {
    this.#requirePool();
    const id = randomUUID();
    const continuityScore = this.#scoreFromObject(archive, 0.6);
    await this.pool.query(
      `insert into cognition_lineage_archives
       (id, workspace_id, mesh_id, ancestor_ref, descendant_ref, memory_type, archive, continuity_score, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
      [id, workspaceId, meshId, ancestorRef, descendantRef, memoryType, archive, continuityScore]
    );
    await this.#observe({ workspaceId, meshId, eventType: "memory.lineage.archived", payload: { archiveId: id, continuityScore } });
    return this.memory({ workspaceId, meshId });
  }

  async listAsset({ workspaceId, meshId, assetType = "cognition_asset", ownerRef, valuation = 1, metadata = {} }) {
    this.#requirePool();
    const id = randomUUID();
    const productivityScore = Math.min(1, Math.max(0, Number(valuation) / 10));
    await this.pool.query(
      `insert into intelligence_market_assets
       (id, workspace_id, mesh_id, asset_type, owner_ref, valuation, productivity_score, metadata, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
      [id, workspaceId, meshId, assetType, ownerRef, Number(valuation), productivityScore, metadata]
    );
    await this.#observe({ workspaceId, meshId, eventType: "economy.asset.listed", payload: { assetId: id, valuation, productivityScore } });
    return this.economy({ workspaceId, meshId });
  }

  async topology({ workspaceId, meshId }) {
    this.#requirePool();
    const meshes = meshId ? [await this.getMesh({ workspaceId, meshId })] : await this.listMeshes({ workspaceId });
    const ids = meshes.map((mesh) => mesh.id);
    if (!ids.length) return { meshes: [], species: [], science: [], routes: [], simulations: [], governance: [], memory: [], economy: [], analytics: this.#analytics({ meshes: [] }) };
    const [species, science, routes, simulations, governance, memory, economy] = await Promise.all([
      this.pool.query("select * from synthetic_intelligence_species where workspace_id = $1 and mesh_id = any($2) order by fitness_score desc, created_at desc", [workspaceId, ids]),
      this.pool.query("select * from recursive_science_programs where workspace_id = $1 and mesh_id = any($2) order by confidence desc, created_at desc", [workspaceId, ids]),
      this.pool.query("select * from interplanetary_cognition_routes where workspace_id = $1 and mesh_id = any($2) order by bandwidth_score desc, created_at desc", [workspaceId, ids]),
      this.pool.query("select * from recursive_world_simulations where workspace_id = $1 and mesh_id = any($2) order by divergence_score desc, created_at desc", [workspaceId, ids]),
      this.pool.query("select * from super_governance_laws where workspace_id = $1 and mesh_id = any($2) order by trust_score desc, created_at desc", [workspaceId, ids]),
      this.pool.query("select * from cognition_lineage_archives where workspace_id = $1 and mesh_id = any($2) order by continuity_score desc, created_at desc", [workspaceId, ids]),
      this.pool.query("select * from intelligence_market_assets where workspace_id = $1 and mesh_id = any($2) order by productivity_score desc, created_at desc", [workspaceId, ids]),
    ]);
    return {
      meshes,
      species: species.rows,
      science: science.rows,
      routes: routes.rows,
      simulations: simulations.rows,
      governance: governance.rows,
      memory: memory.rows,
      economy: economy.rows,
      analytics: this.#analytics({ meshes, species: species.rows, science: science.rows, routes: routes.rows, simulations: simulations.rows, governance: governance.rows, memory: memory.rows, economy: economy.rows }),
    };
  }

  async observability({ workspaceId, meshId }) {
    const topology = await this.topology({ workspaceId, meshId });
    const events = await this.pool.query(
      "select * from transcendent_observability_events where workspace_id = $1 and ($2::text is null or mesh_id = $2) order by created_at desc limit 100",
      [workspaceId, meshId || null]
    );
    return { ...topology, events: events.rows, heatmap: this.#heatmap({ topology, events: events.rows }) };
  }

  async listMeshes({ workspaceId, limit = 20 }) {
    const result = await this.pool.query("select * from superintelligence_meshes where workspace_id = $1 order by convergence_score desc, created_at desc limit $2", [workspaceId, limit]);
    return result.rows;
  }

  async getMesh({ workspaceId, meshId }) {
    const result = await this.pool.query("select * from superintelligence_meshes where id = $1 and workspace_id = $2", [meshId, workspaceId]);
    if (!result.rows[0]) throw new Error("Superintelligence mesh not found.");
    return result.rows[0];
  }

  async species({ workspaceId, meshId }) { return { species: (await this.pool.query("select * from synthetic_intelligence_species where workspace_id = $1 and mesh_id = $2 order by created_at desc", [workspaceId, meshId])).rows }; }
  async science({ workspaceId, meshId }) { return { science: (await this.pool.query("select * from recursive_science_programs where workspace_id = $1 and mesh_id = $2 order by created_at desc", [workspaceId, meshId])).rows }; }
  async routes({ workspaceId, meshId }) { return { routes: (await this.pool.query("select * from interplanetary_cognition_routes where workspace_id = $1 and mesh_id = $2 order by created_at desc", [workspaceId, meshId])).rows }; }
  async simulations({ workspaceId, meshId }) { return { simulations: (await this.pool.query("select * from recursive_world_simulations where workspace_id = $1 and mesh_id = $2 order by created_at desc", [workspaceId, meshId])).rows }; }
  async governance({ workspaceId, meshId }) { return { governance: (await this.pool.query("select * from super_governance_laws where workspace_id = $1 and mesh_id = $2 order by created_at desc", [workspaceId, meshId])).rows }; }
  async memory({ workspaceId, meshId }) { return { memory: (await this.pool.query("select * from cognition_lineage_archives where workspace_id = $1 and mesh_id = $2 order by created_at desc", [workspaceId, meshId])).rows }; }
  async economy({ workspaceId, meshId }) { return { economy: (await this.pool.query("select * from intelligence_market_assets where workspace_id = $1 and mesh_id = $2 order by created_at desc", [workspaceId, meshId])).rows }; }

  async #observe({ workspaceId, meshId, eventType, payload = {} }) {
    const heat = eventType.includes("simulation") ? 0.7 : eventType.includes("governance") ? 0.55 : 0.4;
    const anomalyScore = payload.complianceState === "limited_by_infrastructure" || payload.status === "blocked" ? 0.75 : 0;
    await this.pool.query(
      `insert into transcendent_observability_events
       (id, workspace_id, mesh_id, event_type, payload, heat, anomaly_score, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, now())`,
      [randomUUID(), workspaceId, meshId || null, eventType, payload, heat, anomalyScore]
    );
    await this.eventBus?.publish?.({ workspaceId, channel: `workspace:${workspaceId}`, type: eventType, payload: { meshId, ...payload } });
    try {
      await this.runtimeTelemetryService?.record?.({ workspaceId, metric: `super.${eventType}`, value: 1, unit: "event", metadata: { meshId } });
    } catch {
      await this.eventBus?.publish?.({ workspaceId, channel: `workspace:${workspaceId}`, type: "super.telemetry.buffered", payload: { eventType } });
    }
  }

  #analytics({ meshes = [], species = [], science = [], routes = [], simulations = [], governance = [], memory = [], economy = [] }) {
    return {
      meshes: meshes.length,
      avgConvergence: meshes.length ? Number((meshes.reduce((sum, mesh) => sum + Number(mesh.convergence_score || 0), 0) / meshes.length).toFixed(2)) : 0,
      species: species.length,
      sciencePrograms: science.length,
      routes: routes.length,
      simulations: simulations.length,
      governanceLaws: governance.length,
      memoryArchives: memory.length,
      economyAssets: economy.length,
    };
  }

  #heatmap({ topology, events }) {
    return topology.meshes.map((mesh) => ({
      id: mesh.id,
      label: mesh.name,
      convergence: Number(mesh.convergence_score || 0),
      amplification: Number(mesh.amplification_score || 0),
      heat: Number(events.filter((event) => event.mesh_id === mesh.id).reduce((sum, event) => sum + Number(event.heat || 0), 0).toFixed(2)),
      anomalies: events.filter((event) => event.mesh_id === mesh.id && Number(event.anomaly_score || 0) > 0.5).length,
    }));
  }

  #scoreFromObject(value, fallback) {
    return Math.min(1, Math.max(0, Number((fallback + (Object.keys(value || {}).length * 0.03)).toFixed(2))));
  }

  #requirePool() {
    if (!this.pool) throw new Error("Superintelligence mesh requires PostgreSQL DATABASE_URL.");
  }
}
