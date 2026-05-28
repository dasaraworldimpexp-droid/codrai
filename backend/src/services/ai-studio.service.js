import { randomUUID } from "node:crypto";

const MEDIA_TASK_TYPE = {
  image: "image",
  video: "video",
  voice: "voice",
};

export class AiStudioService {
  constructor({ pool, runtimeEngine, providerRegistry, eventBus }) {
    this.pool = pool;
    this.runtimeEngine = runtimeEngine;
    this.providerRegistry = providerRegistry;
    this.eventBus = eventBus;
  }

  async createMediaJob({ workspaceId, userId, projectId, mediaType, mode, prompt, input = {} }) {
    this.#assertReady();
    const normalizedType = MEDIA_TASK_TYPE[mediaType] ? mediaType : null;
    if (!workspaceId) throw Object.assign(new Error("workspaceId is required."), { statusCode: 400 });
    if (!normalizedType) throw Object.assign(new Error("mediaType must be image, video, or voice."), { statusCode: 400 });
    if (!prompt?.trim()) throw Object.assign(new Error("prompt is required."), { statusCode: 400 });

    const id = randomUUID();
    const startedAt = Date.now();
    await this.pool.query(
      `insert into ai_studio_media_jobs
        (id, workspace_id, user_id, project_id, media_type, mode, prompt, input, status, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'routing', now(), now())`,
      [id, workspaceId, userId || null, projectId || null, normalizedType, mode || "standard", prompt, input]
    );

    await this.#event({ workspaceId, userId, type: "ai_studio.media.routing", payload: { jobId: id, mediaType: normalizedType, mode } });

    try {
      const execution = await this.runtimeEngine.execute({
        workspaceId,
        projectId,
        userId,
        taskType: MEDIA_TASK_TYPE[normalizedType],
        intent: prompt,
        input: { ...input, text: prompt, mode },
        qualityTier: input.qualityTier || "balanced",
      });

      const status = execution.mode === "queue" ? "queued" : "completed";
      const runtimeJobId = execution.job?.id || null;
      const provider = execution.result?.provider || null;
      await this.pool.query(
        `update ai_studio_media_jobs
         set status = $2, provider = $3, runtime_task_id = $4, runtime_job_id = $5, output = $6, latency_ms = $7,
             completed_at = case when $2 = 'completed' then now() else completed_at end,
             updated_at = now()
         where id = $1`,
        [id, status, provider, execution.taskId || null, runtimeJobId, execution.result || execution.job || {}, Date.now() - startedAt]
      );
      await this.#event({ workspaceId, userId, type: "ai_studio.media.accepted", payload: { jobId: id, status, runtimeJobId } });
      return this.getMediaJob({ workspaceId, jobId: id });
    } catch (error) {
      await this.pool.query(
        `update ai_studio_media_jobs
         set status = 'blocked', error_message = $2, latency_ms = $3, updated_at = now(), completed_at = now()
         where id = $1`,
        [id, error.message, Date.now() - startedAt]
      );
      await this.#event({ workspaceId, userId, type: "ai_studio.media.blocked", payload: { jobId: id, error: error.message } });
      return this.getMediaJob({ workspaceId, jobId: id });
    }
  }

  async listMediaJobs({ workspaceId, limit = 50 }) {
    this.#assertReady();
    const result = await this.pool.query(
      `select * from ai_studio_media_jobs
       where workspace_id = $1
       order by created_at desc
       limit $2`,
      [workspaceId, Math.min(Number(limit) || 50, 100)]
    );
    return result.rows.map((row) => this.#serializeJob(row));
  }

  async getMediaJob({ workspaceId, jobId }) {
    this.#assertReady();
    const result = await this.pool.query("select * from ai_studio_media_jobs where id = $1 and workspace_id = $2", [jobId, workspaceId]);
    if (!result.rows[0]) throw Object.assign(new Error("AI Studio media job not found."), { statusCode: 404 });
    return this.#serializeJob(result.rows[0]);
  }

  async templates({ workspaceId }) {
    this.#assertReady();
    const result = await this.pool.query(
      `select * from ai_studio_prompt_templates
       where status = 'active' and (workspace_id = $1 or workspace_id is null)
       order by category, name`,
      [workspaceId]
    );
    return result.rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      category: row.category,
      name: row.name,
      prompt: row.prompt,
      metadata: row.metadata || {},
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async readiness({ workspaceId }) {
    const providers = ["fal", "stability", "elevenlabs"].map((name) => {
      try {
        const provider = this.providerRegistry.get(name);
        return {
          name,
          type: provider.providerType,
          capabilities: provider.capabilities || [],
          supportsStreaming: Boolean(provider.supportsStreaming),
          registered: true,
        };
      } catch (error) {
        return { name, registered: false, error: error.message };
      }
    });
    const [summary, templates] = await Promise.all([
      this.pool.query(
        `select media_type, status, count(*)::int as count
         from ai_studio_media_jobs
         where workspace_id = $1
         group by media_type, status`,
        [workspaceId]
      ),
      this.templates({ workspaceId }),
    ]);
    return {
      providers,
      summary: summary.rows,
      templates,
      capabilities: ["image_generation", "image_upscale_ready", "image_variation_ready", "text_to_video", "image_to_video", "voice_synthesis", "realtime_status_events"],
    };
  }

  #assertReady() {
    if (!this.pool) throw new Error("AI Studio requires PostgreSQL DATABASE_URL.");
    if (!this.runtimeEngine) throw new Error("AI Studio requires the production AI runtime engine.");
  }

  #event({ workspaceId, userId, type, payload }) {
    return this.eventBus?.publish?.({
      type,
      channel: `workspace:${workspaceId}`,
      workspaceId,
      actorId: userId,
      payload,
    });
  }

  #serializeJob(row) {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      userId: row.user_id,
      projectId: row.project_id,
      runtimeTaskId: row.runtime_task_id,
      runtimeJobId: row.runtime_job_id,
      mediaType: row.media_type,
      mode: row.mode,
      prompt: row.prompt,
      input: row.input || {},
      provider: row.provider,
      status: row.status,
      output: row.output || {},
      errorMessage: row.error_message,
      latencyMs: row.latency_ms,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      completedAt: row.completed_at,
    };
  }
}
