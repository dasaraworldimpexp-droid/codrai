import { randomUUID } from "node:crypto";
import * as cheerio from "cheerio";

export class RealtimeKnowledgeService {
  constructor({ pool, toolExecutionEngine, aiRuntimeEngine, providerRegistry, eventBus, chunkingService }) {
    this.pool = pool;
    this.toolExecutionEngine = toolExecutionEngine;
    this.aiRuntimeEngine = aiRuntimeEngine;
    this.providerRegistry = providerRegistry;
    this.eventBus = eventBus;
    this.chunkingService = chunkingService;
  }

  async ingestUrl({ workspaceId, projectId, userId, url }) {
    if (!this.pool) throw new Error("Knowledge ingestion requires PostgreSQL DATABASE_URL.");
    if (!workspaceId || !url) throw new Error("workspaceId and url are required.");
    const id = randomUUID();
    await this.pool.query(
      `insert into knowledge_sources (id, workspace_id, project_id, user_id, source_type, url, status, created_at, updated_at)
       values ($1, $2, $3, $4, 'url', $5, 'ingesting', now(), now())`,
      [id, workspaceId, projectId || null, userId || null, url]
    );
    await this.#event({ workspaceId, projectId, userId, type: "knowledge.ingestion.started", payload: { sourceId: id, url } });

    try {
      const page = await this.toolExecutionEngine.execute({
        workspaceId,
        projectId,
        userId,
        toolName: "browser.navigate",
        input: { url, screenshot: true, extractText: true },
        mode: "sync",
      }, { id: userId });
      const text = page.result?.text || "";
      const title = page.result?.title || this.#titleFromText(text) || url;
      const summary = await this.#summarize({ workspaceId, projectId, userId, title, text });
      const trust = this.#trustScore({ url, text, title });
      await this.#storeMemories({ workspaceId, projectId, userId, sourceId: id, title, text, url });
      await this.pool.query(
        `update knowledge_sources
         set status = 'indexed', title = $2, summary = $3, metadata = $4, updated_at = now()
         where id = $1`,
        [id, title, summary, { url, title, textLength: text.length, screenshot: Boolean(page.result?.screenshotBase64), trustScore: trust.score, trustSignals: trust.signals }]
      );
      await this.#event({ workspaceId, projectId, userId, type: "knowledge.ingestion.completed", payload: { sourceId: id, title } });
      return this.get({ workspaceId, id });
    } catch (error) {
      await this.pool.query("update knowledge_sources set status = 'failed', metadata = $2, updated_at = now() where id = $1", [id, { error: error.message }]);
      await this.#event({ workspaceId, projectId, userId, type: "knowledge.ingestion.failed", payload: { sourceId: id, error: error.message } });
      throw error;
    }
  }

  async list({ workspaceId, limit = 30 }) {
    const result = await this.pool.query("select * from knowledge_sources where workspace_id = $1 order by (metadata->>'trustScore')::numeric desc nulls last, created_at desc limit $2", [workspaceId, limit]);
    return result.rows;
  }

  async rankSources({ workspaceId, limit = 20 }) {
    const result = await this.pool.query(
      `select id, title, url, status, summary, metadata, created_at
       from knowledge_sources
       where workspace_id = $1
       order by (metadata->>'trustScore')::numeric desc nulls last, created_at desc
       limit $2`,
      [workspaceId, limit]
    );
    return result.rows;
  }

  async get({ workspaceId, id }) {
    const result = await this.pool.query("select * from knowledge_sources where id = $1 and workspace_id = $2", [id, workspaceId]);
    if (!result.rows[0]) throw new Error("Knowledge source not found.");
    return result.rows[0];
  }

  async #summarize({ workspaceId, projectId, userId, title, text }) {
    const response = await this.aiRuntimeEngine.execute({
      workspaceId,
      projectId,
      userId,
      taskType: "reasoning",
      intent: `Summarize knowledge source: ${title}`,
      input: { text: `Summarize this source for enterprise AI memory in 6 bullets:\n\n${text.slice(0, 12000)}` },
      qualityTier: "balanced",
    });
    return response.result?.output?.text || response.output?.text || "";
  }

  async #storeMemories({ workspaceId, projectId, userId, sourceId, title, text, url }) {
    const chunks = this.chunkingService.chunk(text || "", { maxChars: 1600, overlap: 120 }).slice(0, 20);
    for (const chunk of chunks) {
      const embedding = await this.#embed(chunk);
      await this.pool.query(
        `insert into ai_memories (id, workspace_id, user_id, project_id, content, metadata, embedding, created_at)
         values ($1, $2, $3, $4, $5, $6, $7::vector, now())`,
        [randomUUID(), workspaceId, userId || null, projectId || null, chunk, { source: "knowledge_url", sourceId, title, url }, embedding ? `[${embedding.join(",")}]` : null]
      );
    }
  }

  async #embed(text) {
    try {
      const openai = this.providerRegistry?.get?.("openai");
      const result = await openai.embed({ input: { text } });
      return result.output.embedding;
    } catch {
      return null;
    }
  }

  #titleFromText(text) {
    const $ = cheerio.load(text || "");
    return $("title").text() || null;
  }

  #trustScore({ url, text, title }) {
    const signals = [];
    let score = 0.4;
    const parsed = new URL(url);
    if (parsed.protocol === "https:") {
      score += 0.15;
      signals.push("https");
    }
    if ([".gov", ".edu"].some((suffix) => parsed.hostname.endsWith(suffix))) {
      score += 0.2;
      signals.push("institutional_domain");
    }
    if ((text || "").length > 1000) {
      score += 0.15;
      signals.push("substantial_content");
    }
    if (title && title !== url) {
      score += 0.1;
      signals.push("title_detected");
    }
    return { score: Number(Math.min(score, 1).toFixed(2)), signals };
  }

  #event({ workspaceId, projectId, userId, type, payload }) {
    return this.eventBus?.publish?.({ type, channel: `workspace:${workspaceId}`, workspaceId, projectId, actorId: userId, payload });
  }
}
