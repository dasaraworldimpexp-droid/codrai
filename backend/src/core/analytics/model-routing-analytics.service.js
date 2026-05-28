import { randomUUID } from "node:crypto";

export class ModelRoutingAnalyticsService {
  constructor({ pool }) {
    this.pool = pool;
  }

  async calculate({ workspaceId }) {
    if (!this.pool) throw new Error("Model routing analytics requires PostgreSQL DATABASE_URL.");
    const result = await this.pool.query(
      `select provider, model, task_type,
              count(*)::int as requests,
              coalesce(avg(latency_ms), 0)::int as avg_latency_ms,
              coalesce(sum(estimated_cost), 0)::numeric(12,4) as estimated_cost,
              avg(case when status = 'failed' then 1 else 0 end)::numeric(8,4) as failure_rate
       from model_usage_events
       where workspace_id = $1 and created_at >= now() - interval '30 days'
       group by provider, model, task_type`,
      [workspaceId]
    );
    const scores = result.rows.map((row) => ({
      ...row,
      score: this.#score(row),
    }));
    for (const row of scores) {
      await this.pool.query(
        `insert into model_routing_scores
         (id, workspace_id, provider, model, task_type, score, requests, avg_latency_ms, estimated_cost, failure_rate, calculated_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())`,
        [randomUUID(), workspaceId, row.provider, row.model, row.task_type, row.score, row.requests, row.avg_latency_ms, row.estimated_cost, row.failure_rate]
      );
    }
    return scores.sort((a, b) => Number(b.score) - Number(a.score));
  }

  async latest({ workspaceId }) {
    const result = await this.pool.query(
      `select distinct on (provider, model, task_type) *
       from model_routing_scores
       where workspace_id = $1
       order by provider, model, task_type, calculated_at desc`,
      [workspaceId]
    );
    return result.rows.sort((a, b) => Number(b.score) - Number(a.score));
  }

  #score(row) {
    const latencyPenalty = Math.min(Number(row.avg_latency_ms || 0) / 10000, 1) * 0.25;
    const costPenalty = Math.min(Number(row.estimated_cost || 0) / 10, 1) * 0.25;
    const failurePenalty = Number(row.failure_rate || 0) * 0.4;
    const requestSignal = Math.min(Number(row.requests || 0) / 100, 1) * 0.1;
    return Number(Math.max(0, 1 - latencyPenalty - costPenalty - failurePenalty + requestSignal).toFixed(4));
  }
}
