import { randomUUID } from "node:crypto";

export class ComputerUseService {
  constructor({ pool, browserAutomation, eventBus }) {
    this.pool = pool;
    this.browserAutomation = browserAutomation;
    this.eventBus = eventBus;
  }

  async run({ workspaceId, projectId, userId, startUrl, steps = [] }) {
    if (!this.pool) throw new Error("Computer-use sessions require PostgreSQL DATABASE_URL.");
    if (!workspaceId || !startUrl) throw new Error("workspaceId and startUrl are required.");
    const id = randomUUID();
    await this.pool.query(
      `insert into browser_sessions (id, workspace_id, project_id, user_id, status, current_url, created_at, updated_at)
       values ($1, $2, $3, $4, 'running', $5, now(), now())`,
      [id, workspaceId, projectId || null, userId || null, startUrl]
    );
    await this.#event({ workspaceId, projectId, userId, type: "computer_use.session.started", payload: { sessionId: id, startUrl } });
    try {
      const result = await this.browserAutomation.workflow({ startUrl, steps, workspaceId, sessionId: id });
      await this.pool.query(
        `update browser_sessions
         set status = 'completed', current_url = $2, navigation_memory = $3, completed_at = now(), updated_at = now()
         where id = $1`,
        [id, result.url, JSON.stringify(result.memory || [])]
      );
      await this.#captureMemory({ workspaceId, projectId, userId, sessionId: id, result });
      await this.#event({ workspaceId, projectId, userId, type: "computer_use.session.completed", payload: { sessionId: id, url: result.url } });
      return { sessionId: id, ...result };
    } catch (error) {
      await this.pool.query("update browser_sessions set status = 'failed', navigation_memory = $2, completed_at = now(), updated_at = now() where id = $1", [id, JSON.stringify([{ error: error.message, at: new Date().toISOString() }])]);
      await this.#event({ workspaceId, projectId, userId, type: "computer_use.session.failed", payload: { sessionId: id, error: error.message } });
      throw error;
    }
  }

  async #captureMemory({ workspaceId, projectId, userId, sessionId, result }) {
    const summary = [
      `Browser session ${sessionId} completed.`,
      `Title: ${result.title || "untitled"}`,
      `URL: ${result.url}`,
      `Snapshots: ${(result.memory || []).length}`,
      (result.memory || []).map((item) => item.text).filter(Boolean).join("\n").slice(0, 1800),
    ].filter(Boolean).join("\n");
    await this.pool.query(
      `insert into ai_memories (id, workspace_id, project_id, user_id, content, metadata, created_at)
       values ($1, $2, $3, $4, $5, $6, now())`,
      [randomUUID(), workspaceId, projectId || null, userId || null, summary, { type: "browser_session", sessionId, url: result.url, title: result.title }]
    );
  }

  async list({ workspaceId, limit = 20 }) {
    await this.#markStuckSessions(workspaceId);
    const result = await this.pool.query("select * from browser_sessions where workspace_id = $1 order by created_at desc limit $2", [workspaceId, limit]);
    return result.rows;
  }

  async replay({ workspaceId, sessionId }) {
    if (!workspaceId || !sessionId) throw Object.assign(new Error("workspaceId and sessionId are required."), { statusCode: 400 });
    await this.#markStuckSessions(workspaceId);
    const result = await this.pool.query("select * from browser_sessions where workspace_id = $1 and id = $2", [workspaceId, sessionId]);
    const session = result.rows[0];
    if (!session) throw Object.assign(new Error("Browser session was not found."), { statusCode: 404 });
    const memory = Array.isArray(session.navigation_memory) ? session.navigation_memory : [];
    return {
      session,
      replay: {
        status: memory.length ? "available" : "empty",
        timeline: memory.map((item, index) => ({
          index,
          action: item.action || "event",
          url: item.url || session.current_url,
          title: item.title || null,
          textPreview: item.text ? String(item.text).slice(0, 260) : item.error || "",
          capturedAt: item.capturedAt || item.at || session.updated_at || session.created_at,
        })),
      },
    };
  }

  async #markStuckSessions(workspaceId) {
    if (!workspaceId) return;
    const staleMinutes = Number(process.env.BROWSER_SESSION_STALE_MINUTES || 10);
    await this.pool.query(
      `update browser_sessions
       set status = 'failed',
           navigation_memory = jsonb_build_array(jsonb_build_object('error', 'Browser session exceeded recovery window and was marked failed by runtime recovery.', 'at', now())),
           completed_at = now(),
           updated_at = now()
       where workspace_id = $1
         and status = 'running'
         and created_at < now() - ($2::text || ' minutes')::interval`,
      [workspaceId, String(staleMinutes)]
    );
  }

  #event({ workspaceId, projectId, userId, type, payload }) {
    return this.eventBus?.publish?.({ type, channel: `workspace:${workspaceId}`, workspaceId, projectId, actorId: userId, payload });
  }
}
