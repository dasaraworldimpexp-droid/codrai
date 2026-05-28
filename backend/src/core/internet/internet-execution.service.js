import { randomUUID } from "node:crypto";

export class InternetExecutionService {
  constructor({ pool, aiRuntimeEngine, computerUseService, eventBus }) {
    this.pool = pool;
    this.aiRuntimeEngine = aiRuntimeEngine;
    this.computerUseService = computerUseService;
    this.eventBus = eventBus;
  }

  async start({ workspaceId, projectId, userId, objective, startUrl }) {
    if (!this.pool) throw new Error("Internet execution requires PostgreSQL DATABASE_URL.");
    if (!workspaceId || !objective || !startUrl) throw new Error("workspaceId, objective, and startUrl are required.");
    const sessionId = randomUUID();
    await this.pool.query(
      `insert into internet_execution_sessions
       (id, workspace_id, project_id, user_id, objective, start_url, status, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, 'planning', now(), now())`,
      [sessionId, workspaceId, projectId || null, userId || null, objective, startUrl]
    );
    await this.#event({ workspaceId, projectId, userId, type: "internet_execution.planning", payload: { sessionId, objective, startUrl } });

    try {
      const plan = await this.#plan({ workspaceId, projectId, userId, objective, startUrl });
      const steps = this.#normalizeSteps(plan.steps);
      await this.#persistSteps({ sessionId, workspaceId, steps });
      await this.pool.query("update internet_execution_sessions set status = 'running', plan = $2, updated_at = now() where id = $1", [sessionId, { ...plan, steps }]);
      await this.#event({ workspaceId, projectId, userId, type: "internet_execution.running", payload: { sessionId, stepCount: steps.length } });

      const result = await this.computerUseService.run({ workspaceId, projectId, userId, startUrl, steps });
      await this.#completeSteps({ sessionId, workspaceId, memories: result.memory || [] });
      await this.pool.query(
        `update internet_execution_sessions
         set status = 'completed', browser_session_id = $2, result = $3, completed_at = now(), updated_at = now()
         where id = $1`,
        [sessionId, result.sessionId, result]
      );
      await this.#event({ workspaceId, projectId, userId, type: "internet_execution.completed", payload: { sessionId, browserSessionId: result.sessionId, url: result.url } });
      return this.get({ workspaceId, sessionId });
    } catch (error) {
      const recovery = await this.#recoveryHint({ workspaceId, projectId, userId, objective, error });
      await this.pool.query(
        "update internet_execution_sessions set status = 'failed', error = $2, result = $3, completed_at = now(), updated_at = now() where id = $1",
        [sessionId, { message: error.message }, { recovery }]
      );
      await this.#event({ workspaceId, projectId, userId, type: "internet_execution.failed", payload: { sessionId, error: error.message, recovery } });
      throw error;
    }
  }

  async list({ workspaceId, limit = 30 }) {
    const result = await this.pool.query("select * from internet_execution_sessions where workspace_id = $1 order by created_at desc limit $2", [workspaceId, limit]);
    return result.rows;
  }

  async get({ workspaceId, sessionId }) {
    const session = await this.pool.query("select * from internet_execution_sessions where id = $1 and workspace_id = $2", [sessionId, workspaceId]);
    if (!session.rows[0]) throw new Error("Internet execution session not found.");
    const steps = await this.pool.query("select * from internet_execution_steps where session_id = $1 order by step_index asc", [sessionId]);
    return { ...session.rows[0], steps: steps.rows };
  }

  async replay({ workspaceId, sessionId, userId }) {
    const session = await this.get({ workspaceId, sessionId });
    return this.start({
      workspaceId,
      projectId: session.project_id,
      userId,
      objective: `Replay internet execution: ${session.objective}`,
      startUrl: session.start_url,
    });
  }

  async #plan({ workspaceId, projectId, userId, objective, startUrl }) {
    const response = await this.aiRuntimeEngine.execute({
      workspaceId,
      projectId,
      userId,
      taskType: "reasoning",
      intent: "Plan browser computer-use internet execution",
      input: {
        text: [
          "Create a safe Playwright browser workflow plan for this internet task.",
          `Start URL: ${startUrl}`,
          `Objective: ${objective}`,
          "Return strict JSON only: { \"steps\": [{ \"action\", \"url\", \"selector\", \"value\", \"key\" }] }.",
          "Allowed actions: navigate, click, fill, press, waitForSelector, extract. Do not bypass captchas or security controls.",
        ].join("\n"),
      },
      outputContract: { json: true },
      qualityTier: "balanced",
    });
    const text = response.result?.output?.text || response.output?.text || "{}";
    return this.#parseJson(text);
  }

  async #recoveryHint({ workspaceId, projectId, userId, objective, error }) {
    try {
      const response = await this.aiRuntimeEngine.execute({
        workspaceId,
        projectId,
        userId,
        taskType: "reasoning",
        intent: "Recover failed internet execution",
        input: { text: `Internet task failed.\nObjective: ${objective}\nError: ${error.message}\nReturn a concise recovery strategy.` },
        qualityTier: "balanced",
      });
      return response.result?.output?.text || response.output?.text || "";
    } catch {
      return "Review selectors, page availability, authentication requirements, and retry with smaller extraction steps.";
    }
  }

  async #persistSteps({ sessionId, workspaceId, steps }) {
    for (let index = 0; index < steps.length; index += 1) {
      await this.pool.query(
        `insert into internet_execution_steps
         (id, session_id, workspace_id, step_index, action, input, status, created_at)
         values ($1, $2, $3, $4, $5, $6, 'pending', now())`,
        [randomUUID(), sessionId, workspaceId, index, steps[index].action, steps[index]]
      );
    }
  }

  async #completeSteps({ sessionId, workspaceId, memories }) {
    for (let index = 0; index < memories.length; index += 1) {
      await this.pool.query(
        `update internet_execution_steps
         set status = 'completed', result = $4, completed_at = now()
         where session_id = $1 and workspace_id = $2 and step_index = $3`,
        [sessionId, workspaceId, index, memories[index]]
      );
    }
  }

  #normalizeSteps(steps = []) {
    const allowed = new Set(["navigate", "click", "fill", "press", "waitForSelector", "extract"]);
    const safe = Array.isArray(steps) ? steps.filter((step) => allowed.has(step.action)) : [];
    return safe.length > 0 ? safe.slice(0, 12) : [{ action: "extract" }];
  }

  #parseJson(text) {
    try {
      return JSON.parse(text);
    } catch {
      const match = text?.match(/\{[\s\S]*\}/);
      if (!match) return { steps: [{ action: "extract" }] };
      try {
        return JSON.parse(match[0]);
      } catch {
        return { steps: [{ action: "extract" }] };
      }
    }
  }

  #event({ workspaceId, projectId, userId, type, payload }) {
    return this.eventBus?.publish?.({ type, channel: `workspace:${workspaceId}`, workspaceId, projectId, actorId: userId, payload });
  }
}
