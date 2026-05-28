import { randomUUID } from "node:crypto";

export class AutonomousCycleService {
  constructor({ pool, orchestratorService, selfImprovementEngine, eventBus }) {
    this.pool = pool;
    this.orchestratorService = orchestratorService;
    this.selfImprovementEngine = selfImprovementEngine;
    this.eventBus = eventBus;
  }

  async start({ workspaceId, projectId, userId, objective }) {
    if (!this.pool) throw new Error("Autonomous cycles require PostgreSQL DATABASE_URL.");
    if (!workspaceId || !objective?.trim()) throw new Error("workspaceId and objective are required.");
    const id = randomUUID();
    await this.pool.query(
      `insert into autonomous_cycles (id, workspace_id, project_id, user_id, objective, status, created_at, updated_at)
       values ($1, $2, $3, $4, $5, 'running', now(), now())`,
      [id, workspaceId, projectId || null, userId || null, objective]
    );
    await this.#event({ workspaceId, projectId, userId, type: "autonomous_cycle.started", payload: { cycleId: id, objective } });

    try {
      const orchestrator = await this.orchestratorService.start({ workspaceId, projectId, userId, objective });
      await this.#snapshot({ id, label: "orchestrator_completed", data: { runId: orchestrator.run?.id, status: orchestrator.run?.status } });
      const improvement = await this.selfImprovementEngine.analyze({ workspaceId, projectId, userId, scope: { cycleId: id, objective } });
      const score = this.#score({ orchestrator, improvement });
      await this.pool.query(
        `update autonomous_cycles
         set status = 'completed', orchestrator_run_id = $2, self_improvement_run_id = $3, score = $4, result = $5, completed_at = now(), updated_at = now()
         where id = $1`,
        [id, orchestrator.run?.id || null, improvement.id, score, { orchestrator, improvement }]
      );
      await this.#event({ workspaceId, projectId, userId, type: "autonomous_cycle.completed", payload: { cycleId: id, score } });
      return this.get({ workspaceId, id });
    } catch (error) {
      await this.pool.query("update autonomous_cycles set status = 'failed', error = $2, completed_at = now(), updated_at = now() where id = $1", [id, { message: error.message }]);
      await this.#event({ workspaceId, projectId, userId, type: "autonomous_cycle.failed", payload: { cycleId: id, error: error.message } });
      throw error;
    }
  }

  async list({ workspaceId, limit = 20 }) {
    const result = await this.pool.query("select * from autonomous_cycles where workspace_id = $1 order by created_at desc limit $2", [workspaceId, limit]);
    return result.rows;
  }

  async get({ workspaceId, id }) {
    const result = await this.pool.query("select * from autonomous_cycles where id = $1 and workspace_id = $2", [id, workspaceId]);
    if (!result.rows[0]) throw new Error("Autonomous cycle not found.");
    return result.rows[0];
  }

  async #snapshot({ id, label, data }) {
    await this.pool.query(
      `update autonomous_cycles
       set snapshots = snapshots || $2::jsonb, updated_at = now()
       where id = $1`,
      [id, JSON.stringify([{ label, data, at: new Date().toISOString() }])]
    );
  }

  #score({ orchestrator, improvement }) {
    const tasks = orchestrator.tasks || [];
    const completed = tasks.filter((task) => task.status === "completed").length;
    const failed = tasks.filter((task) => task.status === "failed").length;
    return {
      taskCompletionRate: tasks.length ? completed / tasks.length : 0,
      failedTasks: failed,
      improvementRecommendations: improvement.recommendations?.length || 0,
    };
  }

  #event({ workspaceId, projectId, userId, type, payload }) {
    return this.eventBus?.publish?.({ type, channel: `workspace:${workspaceId}`, workspaceId, projectId, actorId: userId, payload });
  }
}
