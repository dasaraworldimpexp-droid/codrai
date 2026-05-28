import { randomUUID } from "node:crypto";

export class AgiFederationService {
  constructor({
    pool,
    eventBus,
    distributedRuntimeService,
    distributedExecutionService,
    infrastructureSupervisor,
    runtimeTelemetryService,
  }) {
    this.pool = pool;
    this.eventBus = eventBus;
    this.distributedRuntimeService = distributedRuntimeService;
    this.distributedExecutionService = distributedExecutionService;
    this.infrastructureSupervisor = infrastructureSupervisor;
    this.runtimeTelemetryService = runtimeTelemetryService;
  }

  async createFederation({ workspaceId, userId, name, objective, coordinationPolicy = {} }) {
    this.#requirePool();
    if (!workspaceId || !name || !objective) throw new Error("workspaceId, name, and objective are required.");
    const id = randomUUID();
    await this.pool.query(
      `insert into agi_federations
       (id, workspace_id, name, objective, coordination_policy, created_by, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, now(), now())`,
      [id, workspaceId, name, objective, coordinationPolicy, userId || null]
    );
    await this.#event({ workspaceId, type: "federation.created", payload: { federationId: id, name } });
    await this.#telemetry({ workspaceId, metric: "federation.created", value: 1, unit: "federation" });
    return this.getFederation({ workspaceId, federationId: id });
  }

  async listFederations({ workspaceId, limit = 20 }) {
    this.#requirePool();
    const result = await this.pool.query(
      "select * from agi_federations where workspace_id = $1 order by updated_at desc nulls last, created_at desc limit $2",
      [workspaceId, limit]
    );
    return result.rows;
  }

  async getFederation({ workspaceId, federationId }) {
    this.#requirePool();
    const result = await this.pool.query("select * from agi_federations where id = $1 and workspace_id = $2", [federationId, workspaceId]);
    if (!result.rows[0]) throw new Error("AGI federation not found.");
    return result.rows[0];
  }

  async registerNode({
    workspaceId,
    federationId,
    runtimeNodeId,
    nodeName,
    nodeRole = "worker",
    capabilities = [],
    loadScore = 0,
    cognitionState = {},
  }) {
    this.#requirePool();
    await this.getFederation({ workspaceId, federationId });
    let runtimeNode = null;
    if (this.distributedRuntimeService) {
      runtimeNode = await this.distributedRuntimeService.heartbeat({
        workspaceId,
        nodeId: runtimeNodeId,
        nodeName: nodeName || `${nodeRole}-${federationId.slice(0, 8)}`,
        capabilities,
        loadScore,
        metadata: { federationId, nodeRole },
      });
    }

    const id = randomUUID();
    const healthScore = this.#nodeHealth({ loadScore, cognitionState });
    await this.pool.query(
      `insert into agi_federation_nodes
       (id, workspace_id, federation_id, runtime_node_id, node_role, capabilities, cognition_state, health_score, load_score, status, last_sync_at, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'online', now(), now(), now())`,
      [id, workspaceId, federationId, runtimeNode?.id || runtimeNodeId || null, nodeRole, capabilities, cognitionState, healthScore, Number(loadScore || 0)]
    );
    await this.#linkByCapability({ workspaceId, federationId, nodeId: id, capabilities });
    await this.#event({ workspaceId, type: "federation.node.registered", payload: { federationId, nodeId: id, runtimeNodeId: runtimeNode?.id || runtimeNodeId || null } });
    await this.#telemetry({ workspaceId, nodeId: runtimeNode?.id || runtimeNodeId, metric: "federation.nodes.online", value: 1, unit: "node" });
    return this.getNode({ workspaceId, federationId, nodeId: id });
  }

  async synchronizeCognition({
    workspaceId,
    federationId,
    sourceNodeId,
    targetNodeId,
    cognitionType,
    payload = {},
    confidence = 0.5,
  }) {
    this.#requirePool();
    await this.getFederation({ workspaceId, federationId });
    const id = randomUUID();
    await this.pool.query(
      `insert into agi_cognition_sync_events
       (id, workspace_id, federation_id, source_node_id, target_node_id, cognition_type, payload, confidence, status, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'propagated', now())`,
      [id, workspaceId, federationId, sourceNodeId || null, targetNodeId || null, cognitionType, payload, Number(confidence)]
    );
    if (targetNodeId) {
      await this.pool.query(
        `update agi_federation_nodes
         set cognition_state = cognition_state || $4::jsonb,
             sync_cursor = sync_cursor || $5::jsonb,
             last_sync_at = now(),
             updated_at = now()
         where id = $1 and workspace_id = $2 and federation_id = $3`,
        [targetNodeId, workspaceId, federationId, JSON.stringify({ [cognitionType]: payload }), JSON.stringify({ lastSyncEventId: id })]
      );
    }
    await this.#event({ workspaceId, type: "federation.cognition.synced", payload: { federationId, syncEventId: id, cognitionType, targetNodeId } });
    await this.#telemetry({ workspaceId, metric: "federation.cognition.sync", value: 1, unit: "event", metadata: { cognitionType } });
    return { id, federationId, cognitionType, status: "propagated" };
  }

  async routeWorkload({ workspaceId, federationId, taskType, requiredCapability, priority = 5, payload = {}, userId }) {
    this.#requirePool();
    const node = await this.#selectFederationNode({ workspaceId, federationId, requiredCapability });
    const task = await this.distributedExecutionService.schedule({
      workspaceId,
      userId,
      source: "agi_federation",
      taskType,
      requiredCapability,
      priority,
      payload,
      resourceLimits: { federationId, preferredNodeId: node?.runtime_node_id || null },
    });
    await this.#event({ workspaceId, type: "federation.workload.routed", payload: { federationId, taskId: task.id, nodeId: node?.id || null } });
    return { task, selectedFederationNode: node };
  }

  async openConsensus({ workspaceId, federationId, userId, proposal, votes = [] }) {
    this.#requirePool();
    await this.getFederation({ workspaceId, federationId });
    const decision = this.#decision(votes);
    const id = randomUUID();
    await this.pool.query(
      `insert into agi_federation_consensus
       (id, workspace_id, federation_id, proposal, votes, decision, confidence, created_by, created_at, decided_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, now(), case when $6 <> 'pending' then now() else null end)`,
      [id, workspaceId, federationId, proposal, votes, decision.decision, decision.confidence, userId || null]
    );
    await this.#event({ workspaceId, type: "federation.consensus.opened", payload: { federationId, consensusId: id, decision: decision.decision } });
    return this.consensus({ workspaceId, federationId });
  }

  async topology({ workspaceId, federationId }) {
    this.#requirePool();
    const federations = federationId
      ? [await this.getFederation({ workspaceId, federationId })]
      : await this.listFederations({ workspaceId, limit: 50 });
    const ids = federations.map((item) => item.id);
    if (ids.length === 0) return { federations: [], nodes: [], links: [], cognitionEvents: [], consensus: [], analytics: this.#emptyAnalytics() };
    const [nodes, links, cognition, consensus] = await Promise.all([
      this.pool.query("select * from agi_federation_nodes where workspace_id = $1 and federation_id = any($2) order by status asc, health_score desc", [workspaceId, ids]),
      this.pool.query("select * from agi_federation_links where workspace_id = $1 and federation_id = any($2) order by created_at desc limit 200", [workspaceId, ids]),
      this.pool.query("select * from agi_cognition_sync_events where workspace_id = $1 and federation_id = any($2) order by created_at desc limit 100", [workspaceId, ids]),
      this.pool.query("select * from agi_federation_consensus where workspace_id = $1 and federation_id = any($2) order by created_at desc limit 50", [workspaceId, ids]),
    ]);
    return {
      federations,
      nodes: nodes.rows,
      links: links.rows,
      cognitionEvents: cognition.rows,
      consensus: consensus.rows,
      analytics: this.#analytics({ federations, nodes: nodes.rows, links: links.rows, cognition: cognition.rows, consensus: consensus.rows }),
    };
  }

  async supervise({ workspaceId, federationId }) {
    this.#requirePool();
    const topology = await this.topology({ workspaceId, federationId });
    const infrastructure = await this.infrastructureSupervisor?.diagnostics?.();
    const actions = [];
    const staleNodes = topology.nodes.filter((node) => node.status === "online" && node.last_sync_at && Date.now() - new Date(node.last_sync_at).getTime() > 180000);
    for (const node of staleNodes) {
      await this.pool.query("update agi_federation_nodes set status = 'stale', health_score = 0, updated_at = now() where id = $1", [node.id]);
      actions.push({ type: "node.mark_stale", nodeId: node.id });
    }
    if (infrastructure?.status === "infrastructure_blocked") {
      actions.push({ type: "degraded_mode.routing", reason: "PostgreSQL or Redis infrastructure is not fully available." });
    }
    await this.#event({ workspaceId, type: "federation.supervision.completed", payload: { federationId, actions, infrastructureStatus: infrastructure?.status } });
    return { topology, infrastructure, actions };
  }

  async deploymentReadiness({ workspaceId, federationId, target = "production" }) {
    this.#requirePool();
    const infrastructure = await this.infrastructureSupervisor?.diagnostics?.();
    const topology = await this.topology({ workspaceId, federationId });
    const score = Math.max(0, Math.min(100, Math.round(
      (infrastructure?.readinessScore || 0) * 0.6 +
      (topology.analytics.onlineNodes > 0 ? 20 : 0) +
      (topology.analytics.cognitionEvents > 0 ? 10 : 0) +
      (topology.analytics.consensusResolved > 0 ? 10 : 0)
    )));
    const status = score >= 80 ? "ready" : score >= 50 ? "degraded" : "blocked";
    const id = randomUUID();
    await this.pool.query(
      `insert into agi_federation_deployment_validations
       (id, workspace_id, federation_id, target, readiness_score, checks, status, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, now())`,
      [id, workspaceId, federationId || null, target, score, { infrastructure, federation: topology.analytics }, status]
    );
    await this.#event({ workspaceId, type: "federation.deployment.validated", payload: { federationId, validationId: id, status, score } });
    return { id, status, readinessScore: score, checks: { infrastructure, federation: topology.analytics } };
  }

  async getNode({ workspaceId, federationId, nodeId }) {
    const result = await this.pool.query(
      "select * from agi_federation_nodes where id = $1 and workspace_id = $2 and federation_id = $3",
      [nodeId, workspaceId, federationId]
    );
    if (!result.rows[0]) throw new Error("Federation node not found.");
    return result.rows[0];
  }

  async consensus({ workspaceId, federationId }) {
    const result = await this.pool.query(
      "select * from agi_federation_consensus where workspace_id = $1 and federation_id = $2 order by created_at desc limit 50",
      [workspaceId, federationId]
    );
    return { consensus: result.rows };
  }

  async #selectFederationNode({ workspaceId, federationId, requiredCapability }) {
    const result = await this.pool.query(
      `select * from agi_federation_nodes
       where workspace_id = $1 and federation_id = $2 and status = 'online'
         and ($3::text is null or $3 = any(capabilities))
       order by health_score desc, load_score asc, last_sync_at desc nulls last
       limit 1`,
      [workspaceId, federationId, requiredCapability || null]
    );
    return result.rows[0] || null;
  }

  async #linkByCapability({ workspaceId, federationId, nodeId, capabilities }) {
    if (!capabilities.length) return;
    const peers = await this.pool.query(
      `select id, capabilities from agi_federation_nodes
       where workspace_id = $1 and federation_id = $2 and id <> $3 and capabilities && $4::text[]`,
      [workspaceId, federationId, nodeId, capabilities]
    );
    for (const peer of peers.rows) {
      const shared = peer.capabilities.filter((capability) => capabilities.includes(capability));
      await this.pool.query(
        `insert into agi_federation_links
         (id, workspace_id, federation_id, source_node_id, target_node_id, relation, weight, metadata, created_at)
         values ($1, $2, $3, $4, $5, 'shared_capability', $6, $7, now())`,
        [randomUUID(), workspaceId, federationId, nodeId, peer.id, Math.min(1, shared.length / Math.max(capabilities.length, 1)), { shared }]
      );
    }
  }

  #analytics({ federations, nodes, links, cognition, consensus }) {
    return {
      federations: federations.length,
      nodes: nodes.length,
      onlineNodes: nodes.filter((node) => node.status === "online").length,
      avgHealth: nodes.length ? Number((nodes.reduce((sum, node) => sum + Number(node.health_score || 0), 0) / nodes.length).toFixed(2)) : 0,
      links: links.length,
      cognitionEvents: cognition.length,
      consensusResolved: consensus.filter((item) => item.decision !== "pending").length,
    };
  }

  #emptyAnalytics() {
    return { federations: 0, nodes: 0, onlineNodes: 0, avgHealth: 0, links: 0, cognitionEvents: 0, consensusResolved: 0 };
  }

  #decision(votes) {
    if (!votes.length) return { decision: "pending", confidence: 0 };
    const approve = votes.filter((vote) => vote.vote === "approve").length;
    const reject = votes.filter((vote) => vote.vote === "reject").length;
    const total = Math.max(votes.length, 1);
    if (approve > reject) return { decision: "approved", confidence: Number((approve / total).toFixed(2)) };
    if (reject > approve) return { decision: "rejected", confidence: Number((reject / total).toFixed(2)) };
    return { decision: "pending", confidence: 0.5 };
  }

  #nodeHealth({ loadScore, cognitionState }) {
    const loadPenalty = Math.min(Math.max(Number(loadScore || 0), 0), 1) * 0.45;
    const confidenceBoost = Math.min(Number(cognitionState.confidence || 0), 1) * 0.1;
    return Math.max(0, Math.min(1, Number((1 - loadPenalty + confidenceBoost).toFixed(2))));
  }

  async #telemetry({ workspaceId, nodeId, metric, value, unit, metadata = {} }) {
    try {
      await this.runtimeTelemetryService?.record?.({ workspaceId, nodeId, metric, value, unit, metadata });
    } catch {
      await this.#event({ workspaceId, type: "federation.telemetry.buffered", payload: { metric, value } });
    }
  }

  #event({ workspaceId, type, payload }) {
    return this.eventBus?.publish?.({ type, channel: `workspace:${workspaceId}`, workspaceId, payload });
  }

  #requirePool() {
    if (!this.pool) throw new Error("AGI federation requires PostgreSQL DATABASE_URL.");
  }
}
