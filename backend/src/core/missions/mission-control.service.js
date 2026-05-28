import { randomUUID } from "node:crypto";

export class MissionControlService {
  constructor({ pool, orchestratorService, autonomousCycleService, eventBus }) {
    this.pool = pool;
    this.orchestratorService = orchestratorService;
    this.autonomousCycleService = autonomousCycleService;
    this.eventBus = eventBus;
  }

  async start({ workspaceId, projectId, userId, title, objective, priority = 50, mode = "cycle", parentMissionId, dependsOn = [] }) {
    if (!this.pool) throw new Error("Mission control requires PostgreSQL DATABASE_URL.");
    if (!workspaceId || !title || !objective) throw new Error("workspaceId, title, and objective are required.");
    const id = randomUUID();
    await this.pool.query(
      `insert into autonomous_missions
       (id, workspace_id, project_id, user_id, title, objective, status, priority, parent_mission_id, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, 'running', $7, $8, now(), now())`,
      [id, workspaceId, projectId || null, userId || null, title, objective, Number(priority), parentMissionId || null]
    );
    await this.#persistDependencies({ workspaceId, missionId: id, dependsOn });
    await this.#checkpoint({ missionId: id, workspaceId, label: "mission_started", state: { mode, objective } });
    await this.#event({ workspaceId, projectId, userId, type: "mission.started", payload: { missionId: id, title } });

    try {
      if (mode === "orchestrator") {
        const run = await this.orchestratorService.start({ workspaceId, projectId, userId, objective });
        await this.#checkpoint({ missionId: id, workspaceId, label: "orchestrator_completed", state: { runId: run.run?.id, status: run.run?.status } });
        await this.pool.query(
          "update autonomous_missions set status = $2, orchestrator_run_id = $3, result = $4, completed_at = now(), updated_at = now() where id = $1",
          [id, run.run?.status === "completed" ? "completed" : "needs_attention", run.run?.id || null, run]
        );
      } else {
        const cycle = await this.autonomousCycleService.start({ workspaceId, projectId, userId, objective });
        await this.#checkpoint({ missionId: id, workspaceId, label: "cycle_completed", state: { cycleId: cycle.id, status: cycle.status, score: cycle.score } });
        await this.pool.query(
          "update autonomous_missions set status = $2, cycle_id = $3, result = $4, completed_at = now(), updated_at = now() where id = $1",
          [id, cycle.status === "completed" ? "completed" : "needs_attention", cycle.id, cycle]
        );
      }
      await this.#event({ workspaceId, projectId, userId, type: "mission.completed", payload: { missionId: id } });
      return this.get({ workspaceId, id });
    } catch (error) {
      await this.#checkpoint({ missionId: id, workspaceId, label: "mission_failed", state: { error: error.message } });
      await this.pool.query("update autonomous_missions set status = 'failed', error = $2, completed_at = now(), updated_at = now() where id = $1", [id, { message: error.message }]);
      await this.#event({ workspaceId, projectId, userId, type: "mission.failed", payload: { missionId: id, error: error.message } });
      throw error;
    }
  }

  async list({ workspaceId, limit = 30 }) {
    const result = await this.pool.query("select * from autonomous_missions where workspace_id = $1 order by priority desc, created_at desc limit $2", [workspaceId, limit]);
    return result.rows;
  }

  async get({ workspaceId, id }) {
    const mission = await this.pool.query("select * from autonomous_missions where id = $1 and workspace_id = $2", [id, workspaceId]);
    if (!mission.rows[0]) throw new Error("Mission not found.");
    const checkpoints = await this.pool.query("select * from mission_checkpoints where mission_id = $1 order by created_at desc", [id]);
    const dependencies = await this.pool.query("select * from mission_dependencies where mission_id = $1", [id]);
    return { ...mission.rows[0], checkpoints: checkpoints.rows, dependencies: dependencies.rows };
  }

  async pause({ workspaceId, id, userId }) {
    await this.pool.query("update autonomous_missions set status = 'paused', updated_at = now() where id = $1 and workspace_id = $2", [id, workspaceId]);
    await this.#checkpoint({ missionId: id, workspaceId, label: "mission_paused", state: { by: userId || "system" } });
    await this.#event({ workspaceId, userId, type: "mission.paused", payload: { missionId: id } });
    return this.get({ workspaceId, id });
  }

  async resume({ workspaceId, id, userId }) {
    const mission = await this.get({ workspaceId, id });
    if (mission.status !== "paused" && mission.status !== "needs_attention" && mission.status !== "failed") {
      throw new Error("Only paused, failed, or attention-needed missions can be resumed.");
    }
    await this.pool.query("update autonomous_missions set status = 'running', updated_at = now() where id = $1 and workspace_id = $2", [id, workspaceId]);
    await this.#checkpoint({ missionId: id, workspaceId, label: "mission_resumed", state: { by: userId || "system" } });
    const recovery = await this.orchestratorService.start({
      workspaceId,
      projectId: mission.project_id,
      userId,
      objective: `Resume mission "${mission.title}" from checkpoint ${mission.current_checkpoint}. Objective: ${mission.objective}`,
    });
    await this.pool.query(
      "update autonomous_missions set status = $3, orchestrator_run_id = $4, result = $5, completed_at = now(), updated_at = now() where id = $1 and workspace_id = $2",
      [id, workspaceId, recovery.run?.status === "completed" ? "completed" : "needs_attention", recovery.run?.id || null, recovery]
    );
    await this.#event({ workspaceId, userId, type: "mission.resumed", payload: { missionId: id, runId: recovery.run?.id } });
    return this.get({ workspaceId, id });
  }

  async replay({ workspaceId, id, userId }) {
    const mission = await this.get({ workspaceId, id });
    return this.start({
      workspaceId,
      projectId: mission.project_id,
      userId,
      title: `Replay: ${mission.title}`,
      objective: mission.objective,
      priority: mission.priority,
      mode: "cycle",
      parentMissionId: id,
    });
  }

  async graph({ workspaceId }) {
    const missions = await this.list({ workspaceId, limit: 100 });
    const dependencies = await this.pool.query("select * from mission_dependencies where workspace_id = $1", [workspaceId]);
    return {
      nodes: missions.map((mission) => ({ id: mission.id, label: mission.title, status: mission.status, healthScore: mission.health_score, parentMissionId: mission.parent_mission_id })),
      edges: dependencies.rows.map((dependency) => ({ from: dependency.depends_on_mission_id, to: dependency.mission_id, relation: dependency.relation })),
    };
  }

  async #persistDependencies({ workspaceId, missionId, dependsOn }) {
    for (const dependencyId of dependsOn || []) {
      await this.pool.query(
        `insert into mission_dependencies (id, workspace_id, mission_id, depends_on_mission_id, relation, created_at)
         values ($1, $2, $3, $4, 'blocks', now())
         on conflict (mission_id, depends_on_mission_id) do nothing`,
        [randomUUID(), workspaceId, missionId, dependencyId]
      );
    }
  }

  async #checkpoint({ missionId, workspaceId, label, state }) {
    await this.pool.query(
      "insert into mission_checkpoints (id, mission_id, workspace_id, label, state, created_at) values ($1, $2, $3, $4, $5, now())",
      [randomUUID(), missionId, workspaceId, label, state]
    );
    await this.pool.query("update autonomous_missions set current_checkpoint = $2, updated_at = now() where id = $1", [missionId, label]);
  }

  #event({ workspaceId, projectId, userId, type, payload }) {
    return this.eventBus?.publish?.({ type, channel: `workspace:${workspaceId}`, workspaceId, projectId, actorId: userId, payload });
  }
}
