import { randomUUID } from "node:crypto";
import { ORCHESTRATOR_AGENTS } from "./agent-catalog.js";

export class OrchestratorService {
  constructor({ pool, aiRuntimeEngine, toolExecutionEngine, eventBus, retrievalService }) {
    this.pool = pool;
    this.aiRuntimeEngine = aiRuntimeEngine;
    this.toolExecutionEngine = toolExecutionEngine;
    this.eventBus = eventBus;
    this.retrievalService = retrievalService;
  }

  async start({ workspaceId, projectId, userId, objective }) {
    this.#assertConfigured();
    this.#assertWorkspace(workspaceId);
    if (!objective?.trim()) throw new Error("Objective is required to start an orchestrator run.");

    await this.#seedAgentDefinitions(workspaceId);
    const runId = randomUUID();
    await this.pool.query(
      `insert into orchestrator_runs (id, workspace_id, project_id, user_id, objective, status, created_at, updated_at)
       values ($1, $2, $3, $4, $5, 'planning', now(), now())`,
      [runId, workspaceId, projectId || null, userId || null, objective]
    );

    await this.#publish({ workspaceId, projectId, userId, runId, type: "orchestrator.run.planning", payload: { objective } });
    const context = await this.#retrieveContext({ workspaceId, projectId, objective });
    const plan = await this.#createPlan({ workspaceId, projectId, userId, objective, context });
    await this.#persistTasks({ runId, workspaceId, projectId, tasks: plan.tasks || [] });
    await this.pool.query("update orchestrator_runs set status = 'running', context = $2, updated_at = now() where id = $1", [runId, { plan, context }]);
    return this.resume({ runId, workspaceId, userId });
  }

  async resume({ runId, workspaceId, userId }) {
    this.#assertConfigured();
    this.#assertWorkspace(workspaceId);
    const run = await this.#getRun(runId, workspaceId);
    if (!run) throw new Error("Orchestrator run not found.");
    if (run.status === "cancelled") throw new Error("Cannot resume a cancelled orchestrator run.");

    await this.#publish({ workspaceId, projectId: run.project_id, userId, runId, type: "orchestrator.run.resumed", payload: {} });
    let progressed = true;
    while (progressed) {
      progressed = false;
      const runnable = await this.#runnableTasks(runId, workspaceId);
      await Promise.all(runnable.map((task) => this.#executeTask({ run, task, userId })));
      if (runnable.length > 0) progressed = true;
    }

    const remaining = await this.pool.query("select count(*)::int as count from orchestrator_tasks where run_id = $1 and status not in ('completed', 'skipped', 'cancelled')", [runId]);
    const failed = await this.pool.query("select count(*)::int as count from orchestrator_tasks where run_id = $1 and status = 'failed'", [runId]);
    const status = failed.rows[0].count > 0 ? "needs_attention" : remaining.rows[0].count === 0 ? "completed" : "waiting";

    await this.pool.query(
      "update orchestrator_runs set status = $2, updated_at = now(), completed_at = case when $2 = 'completed' then now() else completed_at end where id = $1",
      [runId, status]
    );
    await this.#publish({ workspaceId, projectId: run.project_id, userId, runId, type: `orchestrator.run.${status}`, payload: {} });
    return this.getRun({ runId, workspaceId });
  }

  async cancel({ runId, workspaceId, userId }) {
    this.#assertConfigured();
    this.#assertWorkspace(workspaceId);
    const run = await this.#getRun(runId, workspaceId);
    if (!run) throw new Error("Orchestrator run not found.");

    await this.pool.query(
      `update orchestrator_tasks
       set status = 'cancelled', updated_at = now()
       where run_id = $1 and status in ('pending', 'retrying', 'running')`,
      [runId]
    );
    await this.pool.query("update orchestrator_runs set status = 'cancelled', updated_at = now(), completed_at = now() where id = $1", [runId]);
    await this.#publish({ workspaceId, projectId: run.project_id, userId, runId, type: "orchestrator.run.cancelled", payload: {} });
    return this.getRun({ runId, workspaceId });
  }

  async list({ workspaceId, limit = 30 }) {
    this.#assertWorkspace(workspaceId);
    const result = await this.pool.query(
      `select id, objective, status, priority, created_at, updated_at, completed_at
       from orchestrator_runs where workspace_id = $1 order by created_at desc limit $2`,
      [workspaceId, limit]
    );
    return result.rows;
  }

  async getRun({ runId, workspaceId }) {
    this.#assertWorkspace(workspaceId);
    const run = await this.#getRun(runId, workspaceId);
    if (!run) throw new Error("Orchestrator run not found.");
    const tasks = await this.pool.query(
      "select * from orchestrator_tasks where run_id = $1 order by priority desc, created_at asc",
      [runId]
    );
    return { run, tasks: tasks.rows };
  }

  async #createPlan({ workspaceId, projectId, userId, objective, context }) {
    const response = await this.aiRuntimeEngine.execute({
      workspaceId,
      projectId,
      userId,
      taskType: "reasoning",
      intent: "Create autonomous orchestrator execution graph",
      input: {
        text: [
          "Create a dependency-aware execution plan for CODRAI.",
          `Objective: ${objective}`,
          `Available agents: ${Object.keys(ORCHESTRATOR_AGENTS).join(", ")}`,
          `Relevant context: ${JSON.stringify(context || [])}`,
          "Return strict JSON only: { \"tasks\": [{ \"id\", \"title\", \"objective\", \"agentType\", \"priority\", \"dependsOn\", \"toolNames\" }] }.",
          "Only include toolNames when the tool is necessary and the assigned agent is permitted to use it.",
        ].join("\n"),
      },
      outputContract: { json: true },
      qualityTier: "premium",
    });
    const text = response.result?.output?.text || response.output?.text || "{}";
    const parsed = this.#parseJsonObject(text);
    return { tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [] };
  }

  async #persistTasks({ runId, workspaceId, projectId, tasks }) {
    const normalizedTasks = tasks.length > 0 ? tasks : [{
      id: randomUUID(),
      agentType: "planner",
      title: "Clarify and execute objective",
      objective: "Create a safe execution plan and complete the first actionable step.",
      priority: 50,
      dependsOn: [],
      toolNames: [],
    }];

    for (const task of normalizedTasks) {
      const id = task.id || randomUUID();
      await this.pool.query(
        `insert into orchestrator_tasks
         (id, run_id, workspace_id, project_id, agent_type, title, objective, status, priority, depends_on, tool_names, created_at, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10, now(), now())`,
        [
          id,
          runId,
          workspaceId,
          projectId || null,
          task.agentType || task.agent_type || "planner",
          task.title || task.objective || "Autonomous task",
          task.objective || task.title || "",
          Number(task.priority || 50),
          this.#stringArray(task.dependsOn || task.depends_on),
          this.#stringArray(task.toolNames || task.tool_names),
        ]
      );
    }
  }

  async #runnableTasks(runId, workspaceId) {
    const result = await this.pool.query(
      `select * from orchestrator_tasks t
       where t.run_id = $1 and t.workspace_id = $2 and t.status in ('pending', 'retrying')
       and not exists (
         select 1 from unnest(t.depends_on) dep(id)
         join orchestrator_tasks d on d.id = dep.id
         where d.status <> 'completed'
       )
       order by t.priority desc
       limit 4`,
      [runId, workspaceId]
    );
    return result.rows;
  }

  async #executeTask({ run, task, userId }) {
    await this.pool.query("update orchestrator_tasks set status = 'running', attempts = attempts + 1, updated_at = now() where id = $1", [task.id]);
    await this.#publish({ workspaceId: task.workspace_id, projectId: task.project_id, userId, runId: task.run_id, type: "orchestrator.task.running", payload: { taskId: task.id, title: task.title } });

    try {
      const agent = await this.#agentForTask(task);
      const toolResults = [];
      for (const toolName of task.tool_names || []) {
        if (!agent.toolPermissions.includes(toolName)) throw new Error(`${agent.name} is not permitted to use ${toolName}`);
        toolResults.push(await this.toolExecutionEngine.execute({
          workspaceId: task.workspace_id,
          projectId: task.project_id,
          userId,
          toolName,
          input: this.#toolInput(toolName, task),
          mode: "sync",
        }, { id: userId }));
      }

      const aiResult = await this.aiRuntimeEngine.execute({
        workspaceId: task.workspace_id,
        projectId: task.project_id,
        userId,
        taskType: task.agent_type === "coder" || task.agent_type === "debugging" ? "coding" : "reasoning",
        systemPrompt: agent.systemPrompt,
        intent: task.title,
        input: { text: [task.objective, `Tool results: ${JSON.stringify(toolResults)}`].join("\n\n") },
        qualityTier: "balanced",
      });
      const result = { agent: agent.type, aiResult, toolResults };
      await this.pool.query("update orchestrator_tasks set status = 'completed', result = $2, completed_at = now(), updated_at = now() where id = $1", [task.id, result]);
      await this.#writeExecutionMemory({ run, task, result, userId });
      await this.#publish({ workspaceId: task.workspace_id, projectId: task.project_id, userId, runId: task.run_id, type: "orchestrator.task.completed", payload: { taskId: task.id } });
    } catch (error) {
      const nextStatus = task.attempts + 1 < task.max_attempts ? "retrying" : "failed";
      await this.pool.query("update orchestrator_tasks set status = $2, error = $3, updated_at = now() where id = $1", [task.id, nextStatus, { message: error.message }]);
      if (nextStatus === "failed") await this.#createRecoveryTask({ task, error });
      await this.#publish({ workspaceId: task.workspace_id, projectId: task.project_id, userId, runId: task.run_id, type: `orchestrator.task.${nextStatus}`, payload: { taskId: task.id, error: error.message } });
    }
  }

  async #agentForTask(task) {
    const result = await this.pool.query(
      `select type, name, system_prompt, tool_permissions, memory_scopes, max_attempts
       from agent_definitions where workspace_id = $1 and type = $2 limit 1`,
      [task.workspace_id, task.agent_type]
    );
    if (!result.rows[0]) return ORCHESTRATOR_AGENTS[task.agent_type] || ORCHESTRATOR_AGENTS.planner;
    const row = result.rows[0];
    return {
      type: row.type,
      name: row.name,
      systemPrompt: row.system_prompt,
      toolPermissions: row.tool_permissions || [],
      memoryScopes: row.memory_scopes || [],
      maxAttempts: row.max_attempts,
    };
  }

  async #seedAgentDefinitions(workspaceId) {
    for (const agent of Object.values(ORCHESTRATOR_AGENTS)) {
      await this.pool.query(
        `insert into agent_definitions
         (id, workspace_id, type, name, system_prompt, tool_permissions, memory_scopes, max_attempts, created_at, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, 3, now(), now())
         on conflict (id) do update set
           name = excluded.name,
           system_prompt = excluded.system_prompt,
           tool_permissions = excluded.tool_permissions,
           memory_scopes = excluded.memory_scopes,
           updated_at = now()`,
        [`${workspaceId}:${agent.type}`, workspaceId, agent.type, agent.name, agent.systemPrompt, agent.toolPermissions, agent.memoryScopes]
      );
    }
  }

  async #retrieveContext({ workspaceId, projectId, objective }) {
    try {
      return await this.retrievalService?.retrieve?.({ workspaceId, projectId, query: objective, limit: 8 }) || [];
    } catch (error) {
      await this.#publish({ workspaceId, projectId, runId: null, type: "orchestrator.memory.retrieval_failed", payload: { error: error.message } });
      return [];
    }
  }

  async #writeExecutionMemory({ run, task, result, userId }) {
    const content = [
      `Orchestrator objective: ${run.objective}`,
      `Completed task: ${task.title}`,
      `Agent: ${task.agent_type}`,
      `Outcome: ${JSON.stringify(result).slice(0, 4000)}`,
    ].join("\n");
    await this.pool.query(
      `insert into ai_memories (id, workspace_id, user_id, project_id, content, metadata, created_at)
       values ($1, $2, $3, $4, $5, $6, now())`,
      [randomUUID(), task.workspace_id, userId || null, task.project_id || null, content, { source: "orchestrator", runId: task.run_id, taskId: task.id, agentType: task.agent_type }]
    );
  }

  async #createRecoveryTask({ task, error }) {
    await this.pool.query(
      `insert into orchestrator_tasks
       (id, run_id, workspace_id, project_id, parent_task_id, agent_type, title, objective, status, priority, depends_on, tool_names, created_at, updated_at)
       values ($1, $2, $3, $4, $5, 'debugging', $6, $7, 'pending', $8, '{}', '{}', now(), now())
       on conflict (id) do nothing`,
      [
        `recovery:${task.id}`,
        task.run_id,
        task.workspace_id,
        task.project_id || null,
        task.id,
        `Recover failed task: ${task.title}`,
        `Analyze and repair this failed autonomous task. Original objective: ${task.objective}. Failure: ${error.message}. Produce a safe recovery plan and any executable next steps.`,
        Math.max(Number(task.priority || 50) - 1, 1),
      ]
    );
  }

  #parseJsonObject(text) {
    try {
      return JSON.parse(text);
    } catch {
      const match = text?.match(/\{[\s\S]*\}/);
      if (!match) return { tasks: [] };
      try {
        return JSON.parse(match[0]);
      } catch {
        return { tasks: [] };
      }
    }
  }

  #toolInput(toolName, task) {
    if (toolName === "browser.search") return { query: task.objective, limit: 5 };
    if (toolName === "browser.navigate") return { url: task.objective.match(/https?:\/\/\S+/)?.[0], screenshot: true };
    if (toolName === "app.generate") return { goal: task.objective };
    if (toolName === "image.generate") return { prompt: task.objective };
    return { prompt: task.objective, objective: task.objective };
  }

  #stringArray(value) {
    return Array.isArray(value) ? value.filter(Boolean).map(String) : [];
  }

  async #getRun(runId, workspaceId) {
    const result = await this.pool.query("select * from orchestrator_runs where id = $1 and workspace_id = $2", [runId, workspaceId]);
    return result.rows[0];
  }

  #publish({ workspaceId, projectId, userId, runId, type, payload }) {
    return this.eventBus?.publish?.({ type, channel: `workspace:${workspaceId}`, workspaceId, projectId, actorId: userId, payload: { runId, ...payload } });
  }

  #assertConfigured() {
    if (!this.pool) throw new Error("Orchestrator requires PostgreSQL DATABASE_URL.");
  }

  #assertWorkspace(workspaceId) {
    if (!workspaceId) throw new Error("workspaceId is required.");
  }
}
