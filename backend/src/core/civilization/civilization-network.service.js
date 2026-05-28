import { randomUUID } from "node:crypto";

export class CivilizationNetworkService {
  constructor({
    pool,
    eventBus,
    civilizationRuntimeService,
    agiFederationService,
    distributedExecutionService,
    infrastructureSupervisor,
    runtimeTelemetryService,
  }) {
    this.pool = pool;
    this.eventBus = eventBus;
    this.civilizationRuntimeService = civilizationRuntimeService;
    this.agiFederationService = agiFederationService;
    this.distributedExecutionService = distributedExecutionService;
    this.infrastructureSupervisor = infrastructureSupervisor;
    this.runtimeTelemetryService = runtimeTelemetryService;
  }

  async create({ workspaceId, userId, federationId, name, objective }) {
    this.#requirePool();
    if (!workspaceId || !name || !objective) throw new Error("workspaceId, name, and objective are required.");
    const id = randomUUID();
    const topology = { federationId: federationId || null, stages: ["emerging", "coordinating", "optimizing", "self_governing"] };
    await this.pool.query(
      `insert into civilization_networks
       (id, workspace_id, federation_id, name, objective, topology, created_by, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, now(), now())`,
      [id, workspaceId, federationId || null, name, objective, topology, userId || null]
    );
    await this.#graph({ workspaceId, civilizationId: id, sourceRef: id, targetRef: federationId || workspaceId, relation: "anchors_to", weight: 0.8 });
    await this.#mesh({ workspaceId, civilizationId: id, eventType: "civilization.network.created", payload: { name, objective, federationId } });
    return this.get({ workspaceId, civilizationId: id });
  }

  async lifecycle({ workspaceId, civilizationId, userId, targetState = "optimizing" }) {
    this.#requirePool();
    const civilization = await this.get({ workspaceId, civilizationId });
    const diagnostics = await this.civilizationRuntimeService.diagnostics({ workspaceId, persist: false });
    const infrastructure = await this.infrastructureSupervisor?.diagnostics?.();
    const intelligenceScore = this.#intelligenceScore({ diagnostics, infrastructure, civilization });
    const governanceScore = this.#governanceScore({ diagnostics, infrastructure });
    await this.pool.query(
      `update civilization_networks
       set lifecycle_state = $3,
           intelligence_score = $4,
           governance_score = $5,
           topology = topology || $6::jsonb,
           updated_at = now()
       where id = $1 and workspace_id = $2`,
      [civilizationId, workspaceId, targetState, intelligenceScore, governanceScore, JSON.stringify({ lastLifecycleBy: userId || null, infrastructureStatus: infrastructure?.status })]
    );
    await this.#graph({ workspaceId, civilizationId, sourceRef: civilization.lifecycle_state, targetRef: targetState, relation: "evolves_to", weight: intelligenceScore });
    await this.#mesh({ workspaceId, civilizationId, eventType: "civilization.lifecycle.transitioned", payload: { from: civilization.lifecycle_state, to: targetState, intelligenceScore, governanceScore } });
    await this.#telemetry({ workspaceId, metric: "civilization.lifecycle.transition", value: 1, unit: "transition", metadata: { targetState } });
    return this.get({ workspaceId, civilizationId });
  }

  async recursiveEvolution({ workspaceId, civilizationId, userId, objective = "Optimize cognition, governance, economy, and runtime resilience." }) {
    this.#requirePool();
    const civilization = await this.get({ workspaceId, civilizationId });
    const topology = civilization.federation_id
      ? await this.agiFederationService.topology({ workspaceId, federationId: civilization.federation_id })
      : { analytics: {} };
    const diagnostics = await this.civilizationRuntimeService.diagnostics({ workspaceId, persist: false });
    const infrastructure = await this.infrastructureSupervisor?.diagnostics?.();
    const analysis = {
      objective,
      federation: topology.analytics,
      diagnostics: diagnostics.status,
      infrastructure: infrastructure?.status,
      recommendations: [
        infrastructure?.status !== "ready" ? "stabilize infrastructure dependencies" : "expand federation cognition throughput",
        (topology.analytics?.onlineNodes || 0) === 0 ? "register federation coordinator nodes" : "route cognition work to healthy nodes",
        diagnostics.status === "healthy" ? "increase autonomous optimization cadence" : "resolve civilization findings first",
      ],
    };
    const mutations = analysis.recommendations.map((item, index) => ({ id: `mutation-${index + 1}`, action: item, risk: item.includes("infrastructure") ? "medium" : "low" }));
    const scoreDelta = Number(((mutations.filter((item) => item.risk === "low").length * 0.03) - (infrastructure?.status === "ready" ? 0 : 0.04)).toFixed(2));
    const id = randomUUID();
    await this.pool.query(
      `insert into recursive_intelligence_runs
       (id, workspace_id, civilization_id, run_type, status, inputs, analysis, mutations, score_delta, created_by, created_at, completed_at)
       values ($1, $2, $3, 'recursive_intelligence_evolution', 'completed', $4, $5, $6, $7, $8, now(), now())`,
      [id, workspaceId, civilizationId, { objective }, analysis, mutations, scoreDelta, userId || null]
    );
    await this.pool.query(
      "update civilization_networks set intelligence_score = greatest(0, least(1, intelligence_score + $3)), updated_at = now() where id = $1 and workspace_id = $2",
      [civilizationId, workspaceId, scoreDelta]
    );
    await this.#graph({ workspaceId, civilizationId, sourceRef: civilizationId, targetRef: id, relation: "optimized_by", weight: Math.max(0.1, 0.7 + scoreDelta) });
    await this.#mesh({ workspaceId, civilizationId, eventType: "intelligence.recursive_evolution.completed", payload: { runId: id, scoreDelta, mutations } });
    return this.evolutionRuns({ workspaceId, civilizationId });
  }

  async createEconomyContract({ workspaceId, civilizationId, capability, providerRef, consumerRef, priceCredits = 1, terms = {} }) {
    this.#requirePool();
    await this.get({ workspaceId, civilizationId });
    const id = randomUUID();
    await this.pool.query(
      `insert into execution_economy_contracts
       (id, workspace_id, civilization_id, capability, provider_ref, consumer_ref, price_credits, terms, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())`,
      [id, workspaceId, civilizationId, capability, providerRef, consumerRef || null, Number(priceCredits), terms]
    );
    await this.#mesh({ workspaceId, civilizationId, eventType: "economy.contract.created", payload: { contractId: id, capability, priceCredits } });
    return this.economy({ workspaceId, civilizationId });
  }

  async arbitrateEconomy({ workspaceId, civilizationId }) {
    this.#requirePool();
    const economy = await this.economy({ workspaceId, civilizationId });
    const open = economy.contracts.filter((item) => item.status === "open");
    const avgPrice = open.length ? open.reduce((sum, item) => sum + Number(item.price_credits || 0), 0) / open.length : 0;
    const decision = avgPrice > 5 ? "reduce_pricing" : open.length > 0 ? "route_to_market" : "seed_capabilities";
    await this.pool.query(
      "update civilization_networks set economy_balance = $3, updated_at = now() where id = $1 and workspace_id = $2",
      [civilizationId, workspaceId, Number((open.length * avgPrice).toFixed(2))]
    );
    await this.#mesh({ workspaceId, civilizationId, eventType: "economy.arbitrated", payload: { decision, openContracts: open.length, avgPrice } });
    return { decision, openContracts: open.length, avgPrice: Number(avgPrice.toFixed(2)) };
  }

  async governanceDecision({ workspaceId, civilizationId, userId, policyRef, decision, rationale = {} }) {
    this.#requirePool();
    const infrastructure = await this.infrastructureSupervisor?.diagnostics?.();
    const trustScore = infrastructure?.status === "ready" ? 0.86 : 0.54;
    const complianceStatus = trustScore >= 0.8 ? "approved" : "requires_infrastructure_review";
    const id = randomUUID();
    await this.pool.query(
      `insert into civilization_governance_decisions
       (id, workspace_id, civilization_id, policy_ref, decision, rationale, trust_score, compliance_status, created_by, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())`,
      [id, workspaceId, civilizationId, policyRef, decision, rationale, trustScore, complianceStatus, userId || null]
    );
    await this.#mesh({ workspaceId, civilizationId, eventType: "governance.decision.recorded", payload: { decisionId: id, trustScore, complianceStatus } });
    return this.governance({ workspaceId, civilizationId });
  }

  async proposeKernelMutation({ workspaceId, civilizationId, userId, targetRuntime, mutationType, plan = {} }) {
    this.#requirePool();
    const infrastructure = await this.infrastructureSupervisor?.diagnostics?.();
    const safetyScore = infrastructure?.status === "ready" ? 0.82 : 0.46;
    const status = safetyScore >= 0.75 ? "approved_for_sandbox" : "held_for_dependency_recovery";
    const id = randomUUID();
    await this.pool.query(
      `insert into runtime_kernel_mutations
       (id, workspace_id, civilization_id, target_runtime, mutation_type, plan, safety_score, status, created_by, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), now())`,
      [id, workspaceId, civilizationId || null, targetRuntime, mutationType, plan, safetyScore, status, userId || null]
    );
    await this.#mesh({ workspaceId, civilizationId, eventType: "runtime.kernel_mutation.proposed", payload: { mutationId: id, status, safetyScore } });
    return this.kernelMutations({ workspaceId, civilizationId });
  }

  async observability({ workspaceId, civilizationId }) {
    this.#requirePool();
    const [topology, evolution, economy, governance, mutations, mesh] = await Promise.all([
      this.topology({ workspaceId, civilizationId }),
      this.evolutionRuns({ workspaceId, civilizationId }),
      this.economy({ workspaceId, civilizationId }),
      this.governance({ workspaceId, civilizationId }),
      this.kernelMutations({ workspaceId, civilizationId }),
      this.meshEvents({ workspaceId, civilizationId }),
    ]);
    return {
      topology,
      evolution,
      economy,
      governance,
      mutations,
      mesh,
      heatmap: this.#heatmap({ topology, mesh: mesh.events }),
    };
  }

  async topology({ workspaceId, civilizationId }) {
    this.#requirePool();
    const civilizations = civilizationId ? [await this.get({ workspaceId, civilizationId })] : await this.list({ workspaceId });
    const ids = civilizations.map((item) => item.id);
    if (ids.length === 0) return { civilizations: [], graph: [], analytics: this.#analytics({ civilizations: [], graph: [] }) };
    const graph = await this.pool.query(
      "select * from civilization_evolution_graphs where workspace_id = $1 and civilization_id = any($2) order by weight desc, created_at desc limit 200",
      [workspaceId, ids]
    );
    return { civilizations, graph: graph.rows, analytics: this.#analytics({ civilizations, graph: graph.rows }) };
  }

  async list({ workspaceId, limit = 20 }) {
    const result = await this.pool.query(
      "select * from civilization_networks where workspace_id = $1 order by intelligence_score desc, created_at desc limit $2",
      [workspaceId, limit]
    );
    return result.rows;
  }

  async get({ workspaceId, civilizationId }) {
    const result = await this.pool.query("select * from civilization_networks where id = $1 and workspace_id = $2", [civilizationId, workspaceId]);
    if (!result.rows[0]) throw new Error("Civilization network not found.");
    return result.rows[0];
  }

  async evolutionRuns({ workspaceId, civilizationId }) {
    const result = await this.pool.query(
      "select * from recursive_intelligence_runs where workspace_id = $1 and civilization_id = $2 order by created_at desc limit 30",
      [workspaceId, civilizationId]
    );
    return { runs: result.rows };
  }

  async economy({ workspaceId, civilizationId }) {
    const result = await this.pool.query(
      "select * from execution_economy_contracts where workspace_id = $1 and civilization_id = $2 order by created_at desc limit 50",
      [workspaceId, civilizationId]
    );
    return { contracts: result.rows };
  }

  async governance({ workspaceId, civilizationId }) {
    const result = await this.pool.query(
      "select * from civilization_governance_decisions where workspace_id = $1 and civilization_id = $2 order by created_at desc limit 50",
      [workspaceId, civilizationId]
    );
    return { decisions: result.rows };
  }

  async kernelMutations({ workspaceId, civilizationId }) {
    const result = await this.pool.query(
      "select * from runtime_kernel_mutations where workspace_id = $1 and ($2::text is null or civilization_id = $2) order by created_at desc limit 50",
      [workspaceId, civilizationId || null]
    );
    return { mutations: result.rows };
  }

  async meshEvents({ workspaceId, civilizationId }) {
    const result = await this.pool.query(
      "select * from intelligence_mesh_events where workspace_id = $1 and ($2::text is null or civilization_id = $2) order by created_at desc limit 100",
      [workspaceId, civilizationId || null]
    );
    return { events: result.rows };
  }

  async #graph({ workspaceId, civilizationId, sourceRef, targetRef, relation, weight = 0.5, metadata = {} }) {
    await this.pool.query(
      `insert into civilization_evolution_graphs
       (id, workspace_id, civilization_id, source_ref, target_ref, relation, weight, metadata, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
      [randomUUID(), workspaceId, civilizationId, sourceRef, targetRef, relation, Number(weight), metadata]
    );
  }

  async #mesh({ workspaceId, civilizationId, eventType, payload = {}, sourceRef = "civilization-network" }) {
    const anomalyScore = payload.infrastructureStatus === "infrastructure_blocked" ? 0.7 : 0;
    const heat = Math.min(1, Number(payload.scoreDelta || 0) + anomalyScore + 0.2);
    await this.pool.query(
      `insert into intelligence_mesh_events
       (id, workspace_id, civilization_id, event_type, source_ref, payload, anomaly_score, heat, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
      [randomUUID(), workspaceId, civilizationId || null, eventType, sourceRef, payload, anomalyScore, heat]
    );
    await this.eventBus?.publish?.({ workspaceId, channel: `workspace:${workspaceId}`, type: eventType, payload: { civilizationId, ...payload } });
  }

  #analytics({ civilizations, graph }) {
    return {
      civilizations: civilizations.length,
      avgIntelligence: civilizations.length ? Number((civilizations.reduce((sum, item) => sum + Number(item.intelligence_score || 0), 0) / civilizations.length).toFixed(2)) : 0,
      avgGovernance: civilizations.length ? Number((civilizations.reduce((sum, item) => sum + Number(item.governance_score || 0), 0) / civilizations.length).toFixed(2)) : 0,
      graphEdges: graph.length,
    };
  }

  #heatmap({ topology, mesh }) {
    return topology.civilizations.map((civilization) => ({
      id: civilization.id,
      label: civilization.name,
      intelligence: Number(civilization.intelligence_score || 0),
      governance: Number(civilization.governance_score || 0),
      heat: Number((mesh.filter((event) => event.civilization_id === civilization.id).reduce((sum, event) => sum + Number(event.heat || 0), 0)).toFixed(2)),
    }));
  }

  #intelligenceScore({ diagnostics, infrastructure, civilization }) {
    const base = Number(civilization.intelligence_score || 0.5);
    const infraPenalty = infrastructure?.status === "ready" ? 0 : 0.12;
    const diagnosticPenalty = diagnostics.status === "healthy" ? 0 : 0.08;
    return Math.max(0, Math.min(1, Number((base + 0.04 - infraPenalty - diagnosticPenalty).toFixed(2))));
  }

  #governanceScore({ diagnostics, infrastructure }) {
    return Math.max(0, Math.min(1, Number((0.75 - (infrastructure?.status === "ready" ? 0 : 0.18) - (diagnostics.status === "healthy" ? 0 : 0.08)).toFixed(2))));
  }

  async #telemetry({ workspaceId, metric, value, unit, metadata = {} }) {
    try {
      await this.runtimeTelemetryService?.record?.({ workspaceId, metric, value, unit, metadata });
    } catch {
      await this.eventBus?.publish?.({ workspaceId, channel: `workspace:${workspaceId}`, type: "civilization.telemetry.buffered", payload: { metric, value } });
    }
  }

  #requirePool() {
    if (!this.pool) throw new Error("Civilization network requires PostgreSQL DATABASE_URL.");
  }
}
