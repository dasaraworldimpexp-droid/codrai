import { randomUUID } from "node:crypto";

export class RuntimeTelemetryService {
  constructor({ pool, eventBus }) {
    this.pool = pool;
    this.eventBus = eventBus;
  }

  async record({ workspaceId, nodeId, metric, value, unit, metadata = {} }) {
    if (!this.pool) throw new Error("Runtime telemetry requires PostgreSQL DATABASE_URL.");
    if (!workspaceId || !metric || value === undefined) throw new Error("workspaceId, metric, and value are required.");
    const id = randomUUID();
    await this.pool.query(
      `insert into runtime_telemetry (id, workspace_id, node_id, metric, value, unit, metadata, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, now())`,
      [id, workspaceId, nodeId || null, metric, Number(value), unit || null, metadata]
    );
    await this.eventBus?.publish?.({
      type: "runtime.telemetry.recorded",
      channel: `workspace:${workspaceId}`,
      workspaceId,
      payload: { id, nodeId, metric, value, unit, metadata },
    });
    return { id, workspaceId, nodeId, metric, value: Number(value), unit, metadata };
  }

  async list({ workspaceId, metric, limit = 50 }) {
    const result = await this.pool.query(
      `select * from runtime_telemetry
       where workspace_id = $1 and ($2::text is null or metric = $2)
       order by created_at desc limit $3`,
      [workspaceId, metric || null, limit]
    );
    return result.rows;
  }

  async summary({ workspaceId }) {
    const result = await this.pool.query(
      `select metric,
              count(*)::int as samples,
              avg(value)::numeric(12,3) as avg_value,
              max(value)::numeric(12,3) as max_value,
              min(value)::numeric(12,3) as min_value
       from runtime_telemetry
       where workspace_id = $1 and created_at >= now() - interval '24 hours'
       group by metric
       order by metric asc`,
      [workspaceId]
    );
    return result.rows;
  }
}
