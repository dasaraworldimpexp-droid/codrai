import { randomUUID } from "node:crypto";
import { ORCHESTRATOR_AGENTS } from "../orchestrator/agent-catalog.js";

const DEFAULT_MAX_AGENT_TASKS = 3;
const DEFAULT_MAX_OBJECTIVE_CHARS = 2200;

export class RealAgentExecutionService {
  constructor({ pool, aiRuntimeEngine, eventBus, memoryService }) {
    this.pool = pool;
    this.aiRuntimeEngine = aiRuntimeEngine;
    this.eventBus = eventBus;
    this.memoryService = memoryService;
  }

  async run({ workspaceId, projectId, userId, objective, agentType = "planner" }) {
    if (!this.pool) throw new Error("Agent execution requires PostgreSQL DATABASE_URL.");
    const runId = randomUUID();
    const normalizedObjective = this.#limitText(objective, Number(process.env.CODRAI_AGENT_MAX_OBJECTIVE_CHARS || DEFAULT_MAX_OBJECTIVE_CHARS));
    const normalizedAgentType = String(agentType || "planner").toLowerCase();

    await this.pool.query(
      `insert into agent_runs (id, workspace_id, project_id, user_id, objective, status, created_at, updated_at)
       values ($1, $2, $3, $4, $5, 'planning', now(), now())`,
      [runId, workspaceId, projectId || null, userId || null, normalizedObjective]
    );

    await this.#message({
      runId,
      workspaceId,
      projectId,
      fromAgent: "runtime_supervisor",
      toAgent: normalizedAgentType,
      type: "run.accepted",
      content: normalizedObjective,
      metadata: { lowResourceMode: true },
    });
    await this.#event({ workspaceId, projectId, userId, runId, type: "agent.run.planning", payload: { objective: normalizedObjective, agentType: normalizedAgentType } });

    if (["runtime", "monitoring"].includes(normalizedAgentType)) {
      return this.#runDiagnosticAgent({ runId, workspaceId, projectId, userId, objective: normalizedObjective, agentType: normalizedAgentType });
    }

    let planResult;
    try {
      planResult = await this.aiRuntimeEngine.execute({
        workspaceId,
        projectId,
        userId,
        taskType: "reasoning",
        intent: "Create executable agent task plan",
        input: {
          text: [
            "Create a compact executable plan for this autonomous task.",
            "Optimize for a low-resource local CPU runtime.",
            "Use at most three tasks unless the objective is impossible otherwise.",
            `Agent type: ${normalizedAgentType}`,
            normalizedObjective,
            "Return strict JSON only: { tasks: [{ title, objective, taskType }] }.",
            "Use taskType values: reasoning, research, coding, document, automation.",
          ].join("\n"),
        },
        outputContract: { json: true },
        qualityTier: "balanced",
        model: this.#modelForAgent(normalizedAgentType),
      });
    } catch (error) {
      const failure = { message: error.message, retryable: error.retryable === true, blockedBy: "reasoning_provider" };
      await this.pool.query("update agent_runs set status = 'failed', error = $2, updated_at = now(), completed_at = now() where id = $1", [runId, failure]);
      await this.#event({ workspaceId, projectId, userId, runId, type: "agent.run.blocked", payload: failure });
      return { runId, status: "failed", error: failure };
    }

    const rawPlanText = planResult.result?.output?.text || planResult.output?.text || "";
    const plan = this.#coercePlan(rawPlanText, normalizedObjective);
    const tasks = (Array.isArray(plan.tasks) ? plan.tasks : []).slice(0, Number(process.env.CODRAI_AGENT_MAX_TASKS || DEFAULT_MAX_AGENT_TASKS));

    await this.pool.query("update agent_runs set status = 'running', plan = $2, updated_at = now() where id = $1", [runId, plan]);
    const results = [];

    for (let index = 0; index < tasks.length; index += 1) {
      const task = tasks[index];
      await this.pool.query(
        `insert into agent_run_steps (run_id, step_index, status, task, created_at)
         values ($1, $2, 'running', $3, now())`,
        [runId, index, task]
      );
      await this.#message({
        runId,
        workspaceId,
        projectId,
        fromAgent: "planner",
        toAgent: normalizedAgentType,
        type: "task.delegated",
        content: task.objective || task.title,
        taskId: task.id || `step-${index}`,
        metadata: { index, taskType: task.taskType || "reasoning" },
      });
      await this.#event({ workspaceId, projectId, userId, runId, type: "agent.step.running", payload: { index, task } });

      try {
        const result = await this.aiRuntimeEngine.execute({
          workspaceId,
          projectId,
          userId,
          taskType: task.taskType || "reasoning",
          intent: task.title || task.objective,
          input: { text: task.objective || task.title },
          qualityTier: "balanced",
          model: this.#modelForTask(task.taskType, normalizedAgentType),
        });
        results.push({ task, result });
        await this.pool.query(
          "update agent_run_steps set status = 'completed', result = $3 where run_id = $1 and step_index = $2",
          [runId, index, result]
        );
        await this.#message({
          runId,
          workspaceId,
          projectId,
          fromAgent: normalizedAgentType,
          toAgent: "runtime_supervisor",
          type: "task.completed",
          content: task.title || task.objective,
          taskId: task.id || `step-${index}`,
          metadata: { index, mode: result.mode, taskId: result.taskId },
        });
        await this.#event({ workspaceId, projectId, userId, runId, type: "agent.step.completed", payload: { index } });
      } catch (error) {
        const failure = { message: error.message, retryable: error.retryable === true };
        await this.pool.query(
          "update agent_run_steps set status = 'failed', error = $3 where run_id = $1 and step_index = $2",
          [runId, index, failure]
        );
        await this.pool.query("update agent_runs set status = 'failed', error = $2, updated_at = now() where id = $1", [runId, failure]);
        await this.#message({
          runId,
          workspaceId,
          projectId,
          fromAgent: "runtime_supervisor",
          toAgent: normalizedAgentType,
          type: "task.failed",
          content: failure.message,
          taskId: task.id || `step-${index}`,
          metadata: { index, retryable: failure.retryable },
        });
        await this.#event({ workspaceId, projectId, userId, runId, type: "agent.run.failed", payload: failure });
        throw error;
      }
    }

    await this.pool.query("update agent_runs set status = 'completed', result = $2, completed_at = now(), updated_at = now() where id = $1", [
      runId,
      { results },
    ]);
    await this.#captureRunMemory({ runId, workspaceId, projectId, userId, agentType: normalizedAgentType, objective: normalizedObjective, status: "completed", result: { steps: results.length } });
    await this.#message({
      runId,
      workspaceId,
      projectId,
      fromAgent: normalizedAgentType,
      toAgent: "runtime_supervisor",
      type: "run.completed",
      content: `Completed ${results.length} step(s).`,
      metadata: { steps: results.length },
    });
    await this.#event({ workspaceId, projectId, userId, runId, type: "agent.run.completed", payload: { steps: results.length } });
    return { runId, status: "completed", results };
  }

  async list({ workspaceId, limit = 30 }) {
    if (!this.pool) throw new Error("Agent execution requires PostgreSQL DATABASE_URL.");
    const result = await this.pool.query(
      `select id, objective, status, plan, result, error, created_at, updated_at, completed_at
       from agent_runs
       where workspace_id = $1
       order by created_at desc
       limit $2`,
      [workspaceId, limit]
    );
    return result.rows;
  }

  async messages({ workspaceId, runId, limit = 50 }) {
    if (!this.pool) throw new Error("Agent execution requires PostgreSQL DATABASE_URL.");
    const result = await this.pool.query(
      `select id, workspace_id, project_id, run_id, from_agent, to_agent, type, content, metadata, created_at
       from agent_messages
       where workspace_id = $1 and ($2::text is null or run_id = $2)
       order by created_at desc
       limit $3`,
      [workspaceId, runId || null, Math.min(Number(limit || 50), 100)]
    );
    return result.rows;
  }

  async dag({ workspaceId, runId }) {
    if (!this.pool) throw new Error("Agent execution requires PostgreSQL DATABASE_URL.");
    if (!workspaceId) throw Object.assign(new Error("workspaceId is required."), { statusCode: 400 });

    const runs = await this.pool.query(
      `select id, objective, status, plan, result, error, created_at, updated_at, completed_at
       from agent_runs
       where workspace_id = $1 and ($2::text is null or id = $2)
       order by created_at desc
       limit $3`,
      [workspaceId, runId || null, runId ? 1 : 12]
    );
    const runIds = runs.rows.map((run) => run.id);
    if (runIds.length === 0) {
      return { workspaceId, runId: runId || null, nodes: [], edges: [], timeline: [], summary: { runs: 0, steps: 0, messages: 0 } };
    }

    const [steps, messages] = await Promise.all([
      this.pool.query(
        `select id, run_id, step_index, status, task, result, error, created_at
         from agent_run_steps
         where run_id = any($1::text[])
         order by run_id, step_index asc`,
        [runIds]
      ),
      this.pool.query(
        `select id, run_id, from_agent, to_agent, type, content, metadata, created_at
         from agent_messages
         where workspace_id = $1 and run_id = any($2::text[])
         order by created_at asc
         limit 120`,
        [workspaceId, runIds]
      ),
    ]);

    const nodes = [];
    const edges = [];
    const timeline = [];

    for (const run of runs.rows) {
      const runNodeId = `agent-run:${run.id}`;
      nodes.push({
        id: runNodeId,
        type: "agent_run",
        label: run.objective,
        status: run.status,
        metadata: { id: run.id, createdAt: run.created_at, updatedAt: run.updated_at, completedAt: run.completed_at },
      });
      timeline.push({ type: "agent.run", status: run.status, label: run.objective, at: run.created_at, ref: run.id });

      for (const step of steps.rows.filter((item) => item.run_id === run.id)) {
        const stepNodeId = `agent-step:${step.id}`;
        nodes.push({
          id: stepNodeId,
          type: "agent_step",
          label: step.task?.title || step.task?.objective || `Step ${step.step_index + 1}`,
          status: step.status,
          metadata: { id: step.id, runId: step.run_id, stepIndex: step.step_index, taskType: step.task?.taskType || "unknown" },
        });
        edges.push({ source: runNodeId, target: stepNodeId, label: "executes" });
        timeline.push({ type: "agent.step", status: step.status, label: step.task?.title || step.task?.objective || `Step ${step.step_index + 1}`, at: step.created_at, ref: step.id });
      }

      for (const message of messages.rows.filter((item) => item.run_id === run.id)) {
        timeline.push({
          type: "agent.message",
          status: message.type,
          label: `${message.from_agent}${message.to_agent ? ` -> ${message.to_agent}` : ""}`,
          content: message.content,
          at: message.created_at,
          ref: message.id,
        });
      }
    }

    return {
      workspaceId,
      runId: runId || null,
      nodes,
      edges,
      timeline: timeline.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()).slice(-160),
      summary: {
        runs: runs.rows.length,
        steps: steps.rows.length,
        messages: messages.rows.length,
        failedSteps: steps.rows.filter((step) => step.status === "failed").length,
      },
    };
  }

  async replay({ workspaceId, runId }) {
    if (!runId) throw Object.assign(new Error("runId is required."), { statusCode: 400 });
    const dag = await this.dag({ workspaceId, runId });
    const memory = await this.pool.query(
      `select id, content, metadata, created_at
       from ai_memories
       where workspace_id = $1 and metadata->>'runId' = $2
       order by created_at asc
       limit 20`,
      [workspaceId, runId]
    );
    return {
      ...dag,
      replay: {
        status: dag.summary.runs > 0 ? "available" : "empty",
        memories: memory.rows,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  async catalog({ workspaceId }) {
    return {
      workspaceId,
      agents: Object.values(ORCHESTRATOR_AGENTS).map((agent) => ({
        type: agent.type,
        name: agent.name,
        toolPermissions: agent.toolPermissions,
        memoryScopes: agent.memoryScopes,
        mode: ["runtime", "monitoring"].includes(agent.type) ? "deterministic_diagnostics" : "model_required",
      })),
    };
  }

  async status({ workspaceId }) {
    if (!this.pool) throw new Error("Agent execution requires PostgreSQL DATABASE_URL.");
    const runs = await this.pool.query(
      `select status, count(*)::int as count
       from agent_runs
       where workspace_id = $1
       group by status`,
      [workspaceId]
    );
    const recent = await this.list({ workspaceId, limit: 10 });
    const [performance, messageCount] = await Promise.all([
      this.pool.query(
        `select
           count(*)::int as total_runs,
           count(*) filter (where status = 'completed')::int as completed_runs,
           count(*) filter (where status = 'failed')::int as failed_runs,
           coalesce(avg(extract(epoch from (completed_at - created_at)) * 1000) filter (where completed_at is not null), 0)::int as avg_latency_ms
         from agent_runs
         where workspace_id = $1`,
        [workspaceId]
      ),
      this.pool.query("select count(*)::int as count from agent_messages where workspace_id = $1", [workspaceId]),
    ]);
    return {
      status: "ready",
      workspaceId,
      agents: Object.keys(ORCHESTRATOR_AGENTS).length,
      runSummary: runs.rows,
      recent,
      performance: performance.rows[0] || {},
      collaborationMessages: messageCount.rows[0]?.count || 0,
      executionModes: ["deterministic_diagnostics", "model_required"],
      lowResourceMode: {
        maxTasks: Number(process.env.CODRAI_AGENT_MAX_TASKS || DEFAULT_MAX_AGENT_TASKS),
        maxObjectiveChars: Number(process.env.CODRAI_AGENT_MAX_OBJECTIVE_CHARS || DEFAULT_MAX_OBJECTIVE_CHARS),
        oneModelActive: process.env.OLLAMA_MAX_LOADED_MODELS || "1",
        workerConcurrency: process.env.WORKER_CONCURRENCY || "1",
      },
      modelRoles: {
        reasoning: process.env.CODRAI_REASONING_MODEL || process.env.OLLAMA_MODEL || null,
        coding: process.env.CODRAI_CODING_MODEL || process.env.OLLAMA_MODEL || null,
        fast: process.env.CODRAI_FAST_MODEL || process.env.OLLAMA_MODEL || null,
      },
    };
  }

  async #runDiagnosticAgent({ runId, workspaceId, projectId, userId, objective, agentType }) {
    const startedAt = Date.now();
    const result = {
      agentType,
      objective,
      diagnostics: {
        postgres: await this.#safe("postgres", async () => {
          const response = await this.pool.query("select now() as server_time");
          return { serverTime: response.rows[0]?.server_time };
        }),
      },
      note: "Diagnostic agents execute without paid model APIs. Reasoning/coding/research agents require a healthy local or external model provider.",
    };
    await this.pool.query("update agent_runs set status = 'completed', plan = $2, result = $3, updated_at = now(), completed_at = now() where id = $1", [
      runId,
      { tasks: [{ title: "Inspect runtime diagnostics", taskType: "diagnostics" }] },
      { ...result, latencyMs: Date.now() - startedAt },
    ]);
    await this.#captureRunMemory({ runId, workspaceId, projectId, userId, agentType, objective, status: "completed", result: { diagnostic: true, latencyMs: Date.now() - startedAt } });
    await this.#message({
      runId,
      workspaceId,
      projectId,
      fromAgent: agentType,
      toAgent: "runtime_supervisor",
      type: "diagnostics.completed",
      content: "Runtime diagnostic agent completed without model inference.",
      metadata: { latencyMs: Date.now() - startedAt, postgres: result.diagnostics.postgres?.ok === true },
    });
    await this.#event({ workspaceId, projectId, userId, runId, type: "agent.run.completed", payload: { agentType, diagnostic: true } });
    return { runId, status: "completed", result };
  }

  async #safe(name, fn) {
    try {
      return { name, ok: true, data: await fn() };
    } catch (error) {
      return { name, ok: false, error: error.message };
    }
  }

  #coercePlan(rawPlanText, fallbackObjective) {
    const text = String(rawPlanText || "").trim();
    if (!text) {
      return {
        tasks: [{ title: "Execute objective", objective: fallbackObjective, taskType: "reasoning" }],
        rawOutput: "",
        parser: "empty_fallback",
      };
    }

    const jsonCandidate = this.#extractJson(text);
    try {
      const parsed = JSON.parse(jsonCandidate);
      if (Array.isArray(parsed.tasks)) return parsed;
    } catch {
      // Local compact models often return plain text even when asked for JSON.
    }

    const extracted = text
      .split(/\r?\n/)
      .map((line) => line.replace(/^[-*]\s*/, "").replace(/^step\s*\d+\s*[:.)-]\s*/i, "").trim())
      .filter((line) => Boolean(line) && !["```", "```json", "{", "}", "[", "]"].includes(line))
      .filter((line) => !/^["'}\]]?tasks["']?\s*:/i.test(line))
      .filter((line) => !/^["']?(title|objective|taskType)["']?\s*:/i.test(line))
      .slice(0, 5)
      .map((line, index) => ({
        title: line.length > 120 ? `${line.slice(0, 117)}...` : line,
        objective: line,
        taskType: index === 0 ? "reasoning" : "automation",
      }));

    return {
      tasks: extracted.length ? extracted : [{ title: "Execute objective", objective: fallbackObjective, taskType: "reasoning" }],
      rawOutput: text,
      parser: "plain_text_fallback",
    };
  }

  #extractJson(text) {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced?.[1]?.trim() || text;
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) return candidate.slice(firstBrace, lastBrace + 1);
    return candidate;
  }

  #limitText(value, limit) {
    const text = String(value || "").trim();
    if (!text) throw Object.assign(new Error("Agent objective is required."), { statusCode: 400 });
    return text.length > limit ? `${text.slice(0, limit - 20)}\n...[truncated]` : text;
  }

  async #message({ runId, workspaceId, projectId, fromAgent, toAgent, type, content, taskId, metadata }) {
    if (!this.pool) return null;
    const id = randomUUID();
    const payload = metadata || {};
    await this.pool.query(
      `insert into agent_messages (id, workspace_id, project_id, run_id, from_agent, to_agent, type, content, metadata, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())`,
      [id, workspaceId, projectId || null, runId || null, fromAgent, toAgent || null, type, content || null, { ...payload, taskId: taskId || null }]
    );
    await this.eventBus?.publish?.({
      type: "agent.message",
      channel: runId ? `agent:${runId}` : `workspace:${workspaceId}`,
      workspaceId,
      projectId,
      payload: { id, runId, fromAgent, toAgent, type, content, taskId, metadata: payload },
    });
    return id;
  }

  async #captureRunMemory({ runId, workspaceId, projectId, userId, agentType, objective, status, result }) {
    const content = [
      `Agent ${agentType} ${status}.`,
      `Objective: ${objective}`,
      `Run: ${runId}`,
      `Result: ${JSON.stringify(result || {}).slice(0, 1200)}`,
    ].join("\n");
    if (this.memoryService?.append) {
      await this.memoryService.append({
        workspaceId,
        projectId,
        userId,
        content,
        metadata: { type: "agent_execution", runId, agentType, status },
      });
      return;
    }
    await this.pool.query(
      `insert into ai_memories (id, workspace_id, project_id, user_id, content, metadata, created_at)
       values ($1, $2, $3, $4, $5, $6, now())`,
      [randomUUID(), workspaceId, projectId || null, userId || null, content, { type: "agent_execution", runId, agentType, status }]
    );
  }

  #modelForAgent(agentType) {
    const normalized = String(agentType || "").toLowerCase();
    if (["coding", "debugging", "deployment"].includes(normalized)) {
      return process.env.CODRAI_CODING_MODEL || process.env.OLLAMA_CODING_MODEL || process.env.OLLAMA_MODEL;
    }
    if (["research", "planner", "memory", "browser", "workflow"].includes(normalized)) {
      return process.env.CODRAI_REASONING_MODEL || process.env.OLLAMA_REASONING_MODEL || process.env.OLLAMA_MODEL;
    }
    return process.env.CODRAI_REASONING_MODEL || process.env.OLLAMA_MODEL;
  }

  #modelForTask(taskType, agentType) {
    const normalized = String(taskType || "").toLowerCase();
    if (["coding", "debugging"].includes(normalized)) {
      return process.env.CODRAI_CODING_MODEL || process.env.OLLAMA_CODING_MODEL || process.env.OLLAMA_MODEL;
    }
    if (["automation", "document"].includes(normalized)) {
      return process.env.CODRAI_FAST_MODEL || process.env.OLLAMA_FAST_MODEL || process.env.OLLAMA_MODEL;
    }
    return this.#modelForAgent(agentType);
  }

  #event({ workspaceId, projectId, userId, runId, type, payload }) {
    return this.eventBus?.publish?.({
      type,
      channel: `agent:${runId}`,
      workspaceId,
      projectId,
      actorId: userId,
      payload: { runId, ...payload },
    });
  }
}
