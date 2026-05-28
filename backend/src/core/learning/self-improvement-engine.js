import { randomUUID } from "node:crypto";

export class SelfImprovementEngine {
  constructor({ pool, aiRuntimeEngine, eventBus }) {
    this.pool = pool;
    this.aiRuntimeEngine = aiRuntimeEngine;
    this.eventBus = eventBus;
  }

  async analyze({ workspaceId, projectId, userId, scope = {} }) {
    if (!this.pool) throw new Error("Self-improvement requires PostgreSQL DATABASE_URL.");
    if (!workspaceId) throw new Error("workspaceId is required.");

    const runId = randomUUID();
    await this.pool.query(
      `insert into self_improvement_runs (id, workspace_id, project_id, user_id, status, scope, created_at)
       values ($1, $2, $3, $4, 'running', $5, now())`,
      [runId, workspaceId, projectId || null, userId || null, scope]
    );
    await this.#publish({ workspaceId, projectId, userId, type: "self_improvement.run.started", payload: { runId } });

    const scorecard = await this.#scoreExecution({ workspaceId, projectId });
    const aiRecommendations = await this.#generateRecommendations({ workspaceId, projectId, userId, scorecard });
    const recommendations = this.#normalizeRecommendations(aiRecommendations);

    await this.pool.query(
      `update self_improvement_runs
       set status = 'completed', scorecard = $2, recommendations = $3, completed_at = now()
       where id = $1`,
      [runId, scorecard, recommendations]
    );

    for (const recommendation of recommendations) {
      await this.pool.query(
        `insert into self_improvement_proposals
         (id, workspace_id, project_id, source_run_id, title, proposal, risk_level, status, created_at)
         values ($1, $2, $3, $4, $5, $6, $7, 'proposed', now())`,
        [randomUUID(), workspaceId, projectId || null, runId, recommendation.title, recommendation, recommendation.riskLevel || "medium"]
      );
    }

    await this.#publish({ workspaceId, projectId, userId, type: "self_improvement.run.completed", payload: { runId, recommendations: recommendations.length } });
    return this.getRun({ workspaceId, runId });
  }

  async listRuns({ workspaceId, limit = 20 }) {
    if (!this.pool) throw new Error("Self-improvement requires PostgreSQL DATABASE_URL.");
    const result = await this.pool.query(
      "select * from self_improvement_runs where workspace_id = $1 order by created_at desc limit $2",
      [workspaceId, limit]
    );
    return result.rows;
  }

  async getRun({ workspaceId, runId }) {
    const result = await this.pool.query("select * from self_improvement_runs where id = $1 and workspace_id = $2", [runId, workspaceId]);
    if (!result.rows[0]) throw new Error("Self-improvement run not found.");
    return result.rows[0];
  }

  async listProposals({ workspaceId, limit = 30 }) {
    const result = await this.pool.query(
      "select * from self_improvement_proposals where workspace_id = $1 order by created_at desc limit $2",
      [workspaceId, limit]
    );
    return result.rows;
  }

  async #scoreExecution({ workspaceId, projectId }) {
    const params = [workspaceId, projectId || null];
    const [tasks, tools, usage] = await Promise.all([
      this.pool.query(
        `select status, agent_type, count(*)::int as count, avg(attempts)::numeric(10,2) as avg_attempts
         from orchestrator_tasks where workspace_id = $1 and ($2::text is null or project_id = $2)
         group by status, agent_type`,
        params
      ),
      this.pool.query(
        `select status, tool_name, count(*)::int as count
         from tool_executions where workspace_id = $1 and ($2::text is null or project_id = $2)
         group by status, tool_name`,
        params
      ),
      this.pool.query(
        `select provider, model, status, count(*)::int as count,
                sum(input_tokens)::bigint as input_tokens,
                sum(output_tokens)::bigint as output_tokens,
                sum(estimated_cost)::numeric(12,4) as estimated_cost
         from model_usage_events where workspace_id = $1
         group by provider, model, status`,
        [workspaceId]
      ),
    ]);

    return {
      tasks: tasks.rows,
      tools: tools.rows,
      usage: usage.rows,
      generatedAt: new Date().toISOString(),
    };
  }

  async #generateRecommendations({ workspaceId, projectId, userId, scorecard }) {
    const response = await this.aiRuntimeEngine.execute({
      workspaceId,
      projectId,
      userId,
      taskType: "reasoning",
      intent: "Generate CODRAI self-improvement recommendations",
      input: {
        text: [
          "Analyze this CODRAI execution scorecard and produce concrete improvement proposals.",
          "Return strict JSON: { \"recommendations\": [{ \"title\", \"riskLevel\", \"reason\", \"implementationPlan\", \"expectedImpact\" }] }.",
          JSON.stringify(scorecard),
        ].join("\n\n"),
      },
      outputContract: { json: true },
      qualityTier: "premium",
    });
    return response.result?.output?.text || "{}";
  }

  #normalizeRecommendations(text) {
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
    } catch {
      const match = text?.match(/\{[\s\S]*\}/);
      if (!match) return [];
      try {
        const parsed = JSON.parse(match[0]);
        return Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
      } catch {
        return [];
      }
    }
  }

  #publish({ workspaceId, projectId, userId, type, payload }) {
    return this.eventBus?.publish?.({ type, channel: `workspace:${workspaceId}`, workspaceId, projectId, actorId: userId, payload });
  }
}
