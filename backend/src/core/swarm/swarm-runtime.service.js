import { randomUUID } from "node:crypto";

export class SwarmRuntimeService {
  constructor({ pool, eventBus, distributedRuntimeService, distributedExecutionService, runtimeTelemetryService }) {
    this.pool = pool;
    this.eventBus = eventBus;
    this.distributedRuntimeService = distributedRuntimeService;
    this.distributedExecutionService = distributedExecutionService;
    this.runtimeTelemetryService = runtimeTelemetryService;
  }

  async createCluster({ workspaceId, userId, name, objective, routingPolicy = {}, consensusPolicy = {} }) {
    if (!this.pool) throw new Error("Swarm runtime requires PostgreSQL DATABASE_URL.");
    if (!workspaceId || !name || !objective) throw new Error("workspaceId, name, and objective are required.");
    const id = randomUUID();
    await this.pool.query(
      `insert into swarm_clusters
       (id, workspace_id, name, objective, status, routing_policy, consensus_policy, created_by, created_at, updated_at)
       values ($1, $2, $3, $4, 'active', $5, $6, $7, now(), now())`,
      [id, workspaceId, name, objective, routingPolicy, consensusPolicy, userId || null]
    );
    await this.#swarmEvent({ workspaceId, clusterId: id, eventType: "swarm.cluster.created", payload: { name, objective } });
    return this.getCluster({ workspaceId, clusterId: id });
  }

  async joinCluster({ workspaceId, clusterId, nodeId, role = "worker", capabilities = [] }) {
    await this.getCluster({ workspaceId, clusterId });
    const node = nodeId ? await this.distributedRuntimeService.getNode({ workspaceId, nodeId }) : null;
    const mergedCapabilities = [...new Set([...(node?.capabilities || []), ...capabilities])];
    const id = randomUUID();
    await this.pool.query(
      `insert into swarm_cluster_nodes
       (id, workspace_id, cluster_id, node_id, role, capabilities, status, sync_state, negotiated_at, last_seen_at, created_at)
       values ($1, $2, $3, $4, $5, $6, 'active', $7, now(), now(), now())
       on conflict (cluster_id, node_id) do update set
         role = excluded.role,
         capabilities = excluded.capabilities,
         status = 'active',
         sync_state = excluded.sync_state,
         negotiated_at = now(),
         last_seen_at = now()`,
      [id, workspaceId, clusterId, nodeId, role, JSON.stringify(mergedCapabilities), { sourceHealth: node?.health_score || null, sourceLoad: node?.load_score || null }]
    );
    await this.#swarmEvent({ workspaceId, clusterId, eventType: "swarm.node.joined", payload: { nodeId, role, capabilities: mergedCapabilities } });
    await this.#telemetry({ workspaceId, nodeId, metric: "swarm.nodes.joined", value: 1, unit: "node", metadata: { clusterId, role } });
    return this.topology({ workspaceId, clusterId });
  }

  async negotiateCapabilities({ workspaceId, clusterId, nodeId, capabilities = [], loadScore = 0, metadata = {} }) {
    const heartbeat = await this.distributedRuntimeService.heartbeat({
      workspaceId,
      nodeId,
      nodeName: metadata.nodeName || nodeId,
      capabilities,
      loadScore,
      metadata,
    });
    await this.joinCluster({ workspaceId, clusterId, nodeId: heartbeat.id, role: metadata.role || "worker", capabilities });
    await this.#swarmEvent({ workspaceId, clusterId, eventType: "swarm.capabilities.negotiated", payload: { nodeId: heartbeat.id, capabilities, loadScore } });
    return heartbeat;
  }

  async sendMessage({ workspaceId, clusterId, fromAgent, toAgent, messageType = "coordination", content, metadata = {} }) {
    await this.getCluster({ workspaceId, clusterId });
    if (!fromAgent || !content) throw new Error("fromAgent and content are required.");
    const id = randomUUID();
    await this.pool.query(
      `insert into swarm_agent_messages
       (id, workspace_id, cluster_id, from_agent, to_agent, message_type, content, metadata, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, now())`,
      [id, workspaceId, clusterId, fromAgent, toAgent || null, messageType, content, metadata]
    );
    await this.#swarmEvent({ workspaceId, clusterId, eventType: "swarm.agent.message", payload: { messageId: id, fromAgent, toAgent, messageType } });
    return this.messages({ workspaceId, clusterId });
  }

  async proposeConsensus({ workspaceId, clusterId, userId, proposal }) {
    await this.getCluster({ workspaceId, clusterId });
    if (!proposal) throw new Error("proposal is required.");
    const id = randomUUID();
    await this.pool.query(
      `insert into swarm_consensus_rounds
       (id, workspace_id, cluster_id, proposal, status, result, created_by, created_at)
       values ($1, $2, $3, $4, 'open', '{}'::jsonb, $5, now())`,
      [id, workspaceId, clusterId, proposal, userId || null]
    );
    await this.#swarmEvent({ workspaceId, clusterId, eventType: "swarm.consensus.opened", payload: { consensusId: id, proposal } });
    return this.consensus({ workspaceId, clusterId });
  }

  async voteConsensus({ workspaceId, consensusId, voter, vote, rationale }) {
    const round = await this.#getConsensus({ workspaceId, consensusId });
    if (!voter || !vote) throw new Error("voter and vote are required.");
    await this.pool.query(
      `insert into swarm_consensus_votes
       (id, workspace_id, consensus_id, voter, vote, rationale, created_at)
       values ($1, $2, $3, $4, $5, $6, now())
       on conflict (consensus_id, voter) do update set vote = excluded.vote, rationale = excluded.rationale, created_at = now()`,
      [randomUUID(), workspaceId, consensusId, voter, vote, rationale || null]
    );
    const result = await this.#consensusResult({ workspaceId, consensusId });
    const status = result.approve > result.reject && result.total >= 2 ? "approved" : result.reject >= result.approve && result.total >= 2 ? "rejected" : "open";
    if (status !== "open") {
      await this.pool.query(
        "update swarm_consensus_rounds set status = $3, result = $4, closed_at = now() where id = $1 and workspace_id = $2",
        [consensusId, workspaceId, status, result]
      );
    }
    await this.#swarmEvent({ workspaceId, clusterId: round.cluster_id, eventType: "swarm.consensus.vote", payload: { consensusId, voter, vote, status, result } });
    return this.consensus({ workspaceId, clusterId: round.cluster_id });
  }

  async federateTask({ workspaceId, clusterId, userId, rootTaskId, strategy = "capability_split", tasks = [] }) {
    await this.getCluster({ workspaceId, clusterId });
    if (!Array.isArray(tasks) || tasks.length === 0) throw new Error("tasks array is required.");
    const federated = [];
    for (const task of tasks.slice(0, 12)) {
      const scheduled = await this.distributedExecutionService.schedule({
        workspaceId,
        projectId: task.projectId,
        userId,
        source: "swarm_federation",
        taskType: task.taskType,
        requiredCapability: task.requiredCapability,
        priority: task.priority || 5,
        payload: task.payload || {},
        resourceLimits: task.resourceLimits || {},
        maxAttempts: task.maxAttempts || 3,
      });
      federated.push(scheduled.id);
      if (rootTaskId) await this.addDependency({ workspaceId, clusterId, fromTaskId: rootTaskId, toTaskId: scheduled.id, relation: "delegates" });
    }
    const id = randomUUID();
    await this.pool.query(
      `insert into swarm_task_federations
       (id, workspace_id, cluster_id, root_task_id, federated_task_ids, strategy, status, created_by, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, 'scheduled', $7, now(), now())`,
      [id, workspaceId, clusterId, rootTaskId || null, federated, strategy, userId || null]
    );
    await this.#swarmEvent({ workspaceId, clusterId, eventType: "swarm.task.federated", payload: { federationId: id, rootTaskId, federated } });
    return { id, rootTaskId, federatedTaskIds: federated };
  }

  async migrateTask({ workspaceId, clusterId, taskId, targetNodeId, userId }) {
    await this.getCluster({ workspaceId, clusterId });
    const task = await this.distributedExecutionService.get({ workspaceId, taskId });
    const node = await this.distributedRuntimeService.getNode({ workspaceId, nodeId: targetNodeId });
    if (!node) throw new Error("Target runtime node not found.");
    await this.pool.query(
      "update distributed_execution_tasks set assigned_node_id = $3, checkpoint = checkpoint || $4::jsonb, updated_at = now() where id = $1 and workspace_id = $2",
      [taskId, workspaceId, targetNodeId, JSON.stringify({ migratedAt: new Date().toISOString(), fromNodeId: task.assigned_node_id, by: userId || null })]
    );
    await this.#swarmEvent({ workspaceId, clusterId, eventType: "swarm.task.migrated", payload: { taskId, fromNodeId: task.assigned_node_id, targetNodeId } });
    return this.distributedExecutionService.get({ workspaceId, taskId });
  }

  async replicateMemory({ workspaceId, clusterId, sourceTaskId, sourceNodeId, targetNodeId, memoryType = "execution_replay", memory = {} }) {
    await this.getCluster({ workspaceId, clusterId });
    const id = randomUUID();
    await this.pool.query(
      `insert into swarm_memory_replications
       (id, workspace_id, cluster_id, source_task_id, source_node_id, target_node_id, memory_type, memory, status, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'replicated', now())`,
      [id, workspaceId, clusterId, sourceTaskId || null, sourceNodeId || null, targetNodeId || null, memoryType, memory]
    );
    await this.#swarmEvent({ workspaceId, clusterId, eventType: "swarm.memory.replicated", payload: { replicationId: id, sourceTaskId, sourceNodeId, targetNodeId, memoryType } });
    return { id, status: "replicated" };
  }

  async addDependency({ workspaceId, clusterId, fromTaskId, toTaskId, relation = "blocks", metadata = {} }) {
    if (!fromTaskId || !toTaskId) throw new Error("fromTaskId and toTaskId are required.");
    const id = randomUUID();
    await this.pool.query(
      `insert into execution_dependency_edges
       (id, workspace_id, cluster_id, from_task_id, to_task_id, relation, status, metadata, created_at)
       values ($1, $2, $3, $4, $5, $6, 'active', $7, now())
       on conflict (from_task_id, to_task_id, relation) do update set status = 'active', metadata = excluded.metadata`,
      [id, workspaceId, clusterId || null, fromTaskId, toTaskId, relation, metadata]
    );
    await this.#swarmEvent({ workspaceId, clusterId, eventType: "swarm.dependency.added", payload: { fromTaskId, toTaskId, relation } });
    return this.dependencyGraph({ workspaceId, clusterId });
  }

  async recoverCluster({ workspaceId, clusterId, userId }) {
    const recovery = await this.distributedExecutionService.recover({ workspaceId, userId });
    const nodes = await this.distributedRuntimeService.list({ workspaceId });
    const staleNodes = nodes.filter((node) => node.status !== "online").map((node) => node.id);
    if (staleNodes.length > 0) {
      await this.pool.query(
        "update swarm_cluster_nodes set status = 'stale' where workspace_id = $1 and cluster_id = $2 and node_id = any($3::text[])",
        [workspaceId, clusterId, staleNodes]
      );
    }
    await this.#swarmEvent({ workspaceId, clusterId, eventType: "swarm.recovery.completed", payload: { recoveredTasks: recovery.recovered, staleNodes } });
    return { ...recovery, staleNodes };
  }

  async optimizeCluster({ workspaceId, clusterId }) {
    const topology = await this.topology({ workspaceId, clusterId });
    const analytics = await this.analytics({ workspaceId, clusterId });
    const overloaded = topology.nodes.filter((node) => Number(node.load_score || 0) > 0.75);
    const idle = topology.nodes.filter((node) => Number(node.load_score || 0) < 0.25 && node.status === "online");
    const recommendation = overloaded.length > 0 && idle.length > 0 ? "migrate_from_overloaded_nodes" : analytics.queuedTasks > topology.nodes.length * 3 ? "federate_pending_work" : "hold";
    const payload = { recommendation, overloaded: overloaded.map((node) => node.id), idle: idle.map((node) => node.id), queuedTasks: analytics.queuedTasks };
    await this.#swarmEvent({ workspaceId, clusterId, eventType: "swarm.optimization.recommended", payload });
    await this.#telemetry({ workspaceId, metric: "swarm.optimization.recommendations", value: 1, unit: "recommendation", metadata: payload });
    return payload;
  }

  async listClusters({ workspaceId }) {
    const result = await this.pool.query("select * from swarm_clusters where workspace_id = $1 order by created_at desc", [workspaceId]);
    return result.rows;
  }

  async getCluster({ workspaceId, clusterId }) {
    const result = await this.pool.query("select * from swarm_clusters where id = $1 and workspace_id = $2", [clusterId, workspaceId]);
    if (!result.rows[0]) throw new Error("Swarm cluster not found.");
    return result.rows[0];
  }

  async topology({ workspaceId, clusterId }) {
    const cluster = await this.getCluster({ workspaceId, clusterId });
    const nodes = await this.pool.query(
      `select scn.*, rn.node_name, rn.status as runtime_status, rn.health_score, rn.load_score, rn.last_heartbeat_at
       from swarm_cluster_nodes scn
       left join runtime_nodes rn on rn.id = scn.node_id and rn.workspace_id = scn.workspace_id
       where scn.workspace_id = $1 and scn.cluster_id = $2
       order by rn.health_score desc nulls last, scn.last_seen_at desc`,
      [workspaceId, clusterId]
    );
    const dependencies = await this.dependencyGraph({ workspaceId, clusterId });
    const edges = [
      ...nodes.rows.map((node) => ({ from: cluster.id, to: node.node_id, type: "member", weight: node.health_score || 0 })),
      ...dependencies.edges,
    ];
    return { cluster, nodes: nodes.rows, edges };
  }

  async messages({ workspaceId, clusterId, limit = 30 }) {
    const result = await this.pool.query(
      "select * from swarm_agent_messages where workspace_id = $1 and cluster_id = $2 order by created_at desc limit $3",
      [workspaceId, clusterId, limit]
    );
    return { messages: result.rows };
  }

  async consensus({ workspaceId, clusterId }) {
    const rounds = await this.pool.query(
      "select * from swarm_consensus_rounds where workspace_id = $1 and cluster_id = $2 order by created_at desc limit 20",
      [workspaceId, clusterId]
    );
    const votes = await this.pool.query(
      `select v.*
       from swarm_consensus_votes v
       join swarm_consensus_rounds r on r.id = v.consensus_id
       where r.workspace_id = $1 and r.cluster_id = $2
       order by v.created_at desc limit 80`,
      [workspaceId, clusterId]
    );
    return { rounds: rounds.rows, votes: votes.rows };
  }

  async dependencyGraph({ workspaceId, clusterId }) {
    const result = await this.pool.query(
      `select * from execution_dependency_edges
       where workspace_id = $1 and ($2::text is null or cluster_id = $2)
       order by created_at desc limit 200`,
      [workspaceId, clusterId || null]
    );
    return {
      edges: result.rows.map((edge) => ({ from: edge.from_task_id, to: edge.to_task_id, type: edge.relation, status: edge.status })),
      records: result.rows,
    };
  }

  async analytics({ workspaceId, clusterId }) {
    const topology = clusterId ? await this.topology({ workspaceId, clusterId }) : { nodes: [] };
    const tasks = await this.distributedExecutionService.analytics({ workspaceId });
    const queuedTasks = tasks.summary.find((item) => item.status === "scheduled")?.count || 0;
    const runningTasks = tasks.summary.find((item) => item.status === "running")?.count || 0;
    const avgHealth = topology.nodes.length ? topology.nodes.reduce((sum, node) => sum + Number(node.health_score || 0), 0) / topology.nodes.length : 0;
    const heatmap = topology.nodes.map((node) => ({
      nodeId: node.node_id,
      role: node.role,
      health: Number(node.health_score || 0),
      load: Number(node.load_score || 0),
      heat: Number(((1 - Number(node.health_score || 0)) + Number(node.load_score || 0)).toFixed(2)),
    }));
    return { queuedTasks, runningTasks, avgHealth: Number(avgHealth.toFixed(2)), heatmap, taskSummary: tasks.summary, latency: tasks.latency };
  }

  async events({ workspaceId, clusterId, limit = 80 }) {
    const result = await this.pool.query(
      `select * from swarm_runtime_events
       where workspace_id = $1 and ($2::text is null or cluster_id = $2)
       order by created_at desc limit $3`,
      [workspaceId, clusterId || null, limit]
    );
    return { events: result.rows };
  }

  async #getConsensus({ workspaceId, consensusId }) {
    const result = await this.pool.query("select * from swarm_consensus_rounds where id = $1 and workspace_id = $2", [consensusId, workspaceId]);
    if (!result.rows[0]) throw new Error("Consensus round not found.");
    return result.rows[0];
  }

  async #consensusResult({ workspaceId, consensusId }) {
    const result = await this.pool.query(
      `select vote, count(*)::int as count
       from swarm_consensus_votes
       where workspace_id = $1 and consensus_id = $2
       group by vote`,
      [workspaceId, consensusId]
    );
    const counts = Object.fromEntries(result.rows.map((row) => [row.vote, row.count]));
    return { approve: counts.approve || 0, reject: counts.reject || 0, abstain: counts.abstain || 0, total: result.rows.reduce((sum, row) => sum + row.count, 0) };
  }

  async #swarmEvent({ workspaceId, clusterId, eventType, payload = {} }) {
    const id = randomUUID();
    await this.pool.query(
      "insert into swarm_runtime_events (id, workspace_id, cluster_id, event_type, payload, created_at) values ($1, $2, $3, $4, $5, now())",
      [id, workspaceId, clusterId || null, eventType, payload]
    );
    await this.eventBus?.publish?.({ type: eventType, channel: `workspace:${workspaceId}`, workspaceId, payload: { clusterId, ...payload } });
    return { id, eventType };
  }

  async #telemetry({ workspaceId, nodeId, metric, value, unit, metadata = {} }) {
    try {
      await this.runtimeTelemetryService?.record?.({ workspaceId, nodeId, metric, value, unit, metadata });
    } catch {
      await this.eventBus?.publish?.({ type: "swarm.telemetry.dropped", channel: `workspace:${workspaceId}`, workspaceId, payload: { metric, value } });
    }
  }
}
