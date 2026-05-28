import { randomUUID } from "node:crypto";

export class DistributedRuntimeService {
  constructor({ pool, eventBus }) {
    this.pool = pool;
    this.eventBus = eventBus;
  }

  async heartbeat({ workspaceId, nodeId = randomUUID(), nodeName, capabilities = [], loadScore = 0, metadata = {} }) {
    if (!this.pool) throw new Error("Distributed runtime requires PostgreSQL DATABASE_URL.");
    if (!workspaceId || !nodeName) throw new Error("workspaceId and nodeName are required.");
    const healthScore = this.#healthScore({ loadScore, metadata });
    await this.pool.query(
      `insert into runtime_nodes
       (id, workspace_id, node_name, capabilities, status, health_score, load_score, metadata, last_heartbeat_at, created_at, updated_at)
       values ($1, $2, $3, $4, 'online', $5, $6, $7, now(), now(), now())
       on conflict (id) do update set
         node_name = excluded.node_name,
         capabilities = excluded.capabilities,
         status = 'online',
         health_score = excluded.health_score,
         load_score = excluded.load_score,
         metadata = excluded.metadata,
         last_heartbeat_at = now(),
         updated_at = now()`,
      [nodeId, workspaceId, nodeName, capabilities, healthScore, loadScore, metadata]
    );
    await this.#markStale(workspaceId);
    await this.#event({ workspaceId, type: "runtime.node.heartbeat", payload: { nodeId, healthScore, loadScore } });
    return this.getNode({ workspaceId, nodeId });
  }

  async list({ workspaceId }) {
    await this.#markStale(workspaceId);
    const result = await this.pool.query(
      "select * from runtime_nodes where workspace_id = $1 order by status asc, health_score desc, last_heartbeat_at desc",
      [workspaceId]
    );
    return result.rows;
  }

  async graph({ workspaceId }) {
    const nodes = await this.list({ workspaceId });
    const edges = nodes.flatMap((node) => (node.capabilities || []).map((capability) => ({
      from: node.id,
      to: capability,
      type: "capability",
      weight: node.health_score,
    })));
    return { nodes, edges };
  }

  async getNode({ workspaceId, nodeId }) {
    const result = await this.pool.query("select * from runtime_nodes where id = $1 and workspace_id = $2", [nodeId, workspaceId]);
    return result.rows[0];
  }

  async #markStale(workspaceId) {
    await this.pool.query(
      `update runtime_nodes
       set status = 'stale', health_score = 0, updated_at = now()
       where workspace_id = $1 and status = 'online' and last_heartbeat_at < now() - interval '90 seconds'`,
      [workspaceId]
    );
  }

  #healthScore({ loadScore, metadata }) {
    const loadPenalty = Math.min(Math.max(Number(loadScore || 0), 0), 1) * 0.5;
    const errorPenalty = Math.min(Number(metadata.recentErrors || 0), 5) * 0.08;
    return Math.max(0, Number((1 - loadPenalty - errorPenalty).toFixed(2)));
  }

  #event({ workspaceId, type, payload }) {
    return this.eventBus?.publish?.({ type, channel: `workspace:${workspaceId}`, workspaceId, payload });
  }
}
