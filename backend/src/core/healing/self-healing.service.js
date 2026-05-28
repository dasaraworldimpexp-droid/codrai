import { randomUUID } from "node:crypto";

export class SelfHealingService {
  constructor({ pool, aiRuntimeEngine, orchestratorService, eventBus }) {
    this.pool = pool;
    this.aiRuntimeEngine = aiRuntimeEngine;
    this.orchestratorService = orchestratorService;
    this.eventBus = eventBus;
  }

  async analyze({ workspaceId, projectId, userId, sourceType = "workspace", sourceId, autoRecover = false }) {
    if (!this.pool) throw new Error("Self-healing requires PostgreSQL DATABASE_URL.");
    if (!workspaceId) throw new Error("workspaceId is required.");
    const id = randomUUID();
    await this.pool.query(
      `insert into self_healing_reports
       (id, workspace_id, project_id, user_id, source_type, source_id, status, created_at)
       values ($1, $2, $3, $4, $5, $6, 'analyzing', now())`,
      [id, workspaceId, projectId || null, userId || null, sourceType, sourceId || null]
    );
    await this.#event({ workspaceId, projectId, userId, type: "self_healing.started", payload: { reportId: id } });

    const evidence = await this.#collectEvidence({ workspaceId, projectId, sourceType, sourceId });
    const diagnosis = await this.#diagnose({ workspaceId, projectId, userId, evidence });
    let recoveryRunId = null;
    if (autoRecover && diagnosis.patchPlan?.objective) {
      const recovery = await this.orchestratorService.start({
        workspaceId,
        projectId,
        userId,
        objective: diagnosis.patchPlan.objective,
      });
      recoveryRunId = recovery.run?.id || null;
    }

    await this.pool.query(
      `update self_healing_reports
       set status = 'completed', findings = $2, patch_plan = $3, recovery_run_id = $4, completed_at = now()
       where id = $1`,
      [id, diagnosis.findings, diagnosis.patchPlan, recoveryRunId]
    );
    await this.#event({ workspaceId, projectId, userId, type: "self_healing.completed", payload: { reportId: id, recoveryRunId } });
    return this.get({ workspaceId, id });
  }

  async list({ workspaceId, limit = 20 }) {
    const result = await this.pool.query("select * from self_healing_reports where workspace_id = $1 order by created_at desc limit $2", [workspaceId, limit]);
    return result.rows;
  }

  async get({ workspaceId, id }) {
    const result = await this.pool.query("select * from self_healing_reports where id = $1 and workspace_id = $2", [id, workspaceId]);
    if (!result.rows[0]) throw new Error("Self-healing report not found.");
    return result.rows[0];
  }

  async #collectEvidence({ workspaceId, projectId, sourceType, sourceId }) {
    const params = [workspaceId, projectId || null];
    const [tasks, tools, apps, deployments] = await Promise.all([
      this.pool.query(
        `select id, title, objective, agent_type, status, error, attempts, updated_at
         from orchestrator_tasks
         where workspace_id = $1 and ($2::text is null or project_id = $2) and status in ('failed', 'retrying')
         order by updated_at desc nulls last limit 20`,
        params
      ),
      this.pool.query(
        `select id, tool_name, status, input, error, completed_at
         from tool_executions
         where workspace_id = $1 and ($2::text is null or project_id = $2) and status = 'failed'
         order by completed_at desc nulls last limit 20`,
        params
      ),
      this.pool.query(
        `select id, project_id, goal, status, error, debug_report, completed_at
         from app_generation_runs
         where workspace_id = $1 and ($2::text is null or project_id = $2) and status <> 'completed'
         order by completed_at desc nulls last limit 10`,
        params
      ),
      this.pool.query(
        `select id, project_id, target, status, error, execution_result, completed_at
         from deployment_plans
         where workspace_id = $1 and ($2::text is null or project_id = $2) and status in ('failed', 'planned')
         order by created_at desc limit 10`,
        params
      ),
    ]);
    return { sourceType, sourceId, tasks: tasks.rows, tools: tools.rows, apps: apps.rows, deployments: deployments.rows };
  }

  async #diagnose({ workspaceId, projectId, userId, evidence }) {
    const response = await this.aiRuntimeEngine.execute({
      workspaceId,
      projectId,
      userId,
      taskType: "coding",
      intent: "Diagnose CODRAI runtime failures and generate safe recovery plan",
      input: {
        text: [
          "Analyze this real CODRAI failure evidence. Return strict JSON only.",
          "Shape: { \"findings\": [{ \"severity\", \"title\", \"evidence\", \"fix\" }], \"patchPlan\": { \"objective\", \"risk\", \"steps\" } }.",
          "Recovery objective must be executable by the orchestrator and must not request destructive operations.",
          JSON.stringify(evidence),
        ].join("\n\n"),
      },
      outputContract: { json: true },
      qualityTier: "premium",
    });
    return this.#parseDiagnosis(response.result?.output?.text || response.output?.text || "{}");
  }

  #parseDiagnosis(text) {
    try {
      const parsed = JSON.parse(text);
      return { findings: parsed.findings || [], patchPlan: parsed.patchPlan || parsed.patch_plan || {} };
    } catch {
      const match = text?.match(/\{[\s\S]*\}/);
      if (!match) return { findings: [], patchPlan: {} };
      try {
        const parsed = JSON.parse(match[0]);
        return { findings: parsed.findings || [], patchPlan: parsed.patchPlan || parsed.patch_plan || {} };
      } catch {
        return { findings: [], patchPlan: {} };
      }
    }
  }

  #event({ workspaceId, projectId, userId, type, payload }) {
    return this.eventBus?.publish?.({ type, channel: `workspace:${workspaceId}`, workspaceId, projectId, actorId: userId, payload });
  }
}
