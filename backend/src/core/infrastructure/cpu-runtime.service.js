import os from "node:os";

async function measure(name, fn) {
  const startedAt = Date.now();
  try {
    const data = await fn();
    return { name, status: "ok", latencyMs: Date.now() - startedAt, data };
  } catch (error) {
    return { name, status: "blocked", latencyMs: Date.now() - startedAt, error: error.message };
  }
}

async function fetchJson(url, timeoutMs = 2000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return { ok: false, error: `${response.status} ${response.statusText}` };
    return { ok: true, data: await response.json() };
  } catch (error) {
    return { ok: false, error: error.name === "AbortError" ? "request timed out" : error.message };
  } finally {
    clearTimeout(timeout);
  }
}

export class CpuRuntimeService {
  constructor({ pool, redis, workerSupervisorService, eventBus }) {
    this.pool = pool;
    this.redis = redis;
    this.workerSupervisorService = workerSupervisorService;
    this.eventBus = eventBus;
  }

  async status({ workspaceId }) {
    const startedAt = Date.now();
    const ollamaBaseUrl = (process.env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/v1$/, "").replace(/\/$/, "");
    const [postgres, redis, queues, ollamaTags, ollamaPs, apiStats, transcriptStats, deploymentStats] = await Promise.all([
      measure("postgres", async () => {
        if (!this.pool) return { configured: false };
        const result = await this.pool.query("select now() as server_time");
        return { configured: true, serverTime: result.rows[0]?.server_time };
      }),
      measure("redis", async () => {
        if (!this.redis) return { configured: false };
        return { configured: true, ping: await this.redis.ping() };
      }),
      measure("queues", async () => this.workerSupervisorService?.queues?.({ workspaceId }) || { status: "not_configured" }),
      measure("ollama.tags", async () => fetchJson(`${ollamaBaseUrl}/api/tags`)),
      measure("ollama.active", async () => fetchJson(`${ollamaBaseUrl}/api/ps`)),
      measure("api.latency", async () => this.#apiStats(workspaceId)),
      measure("transcripts", async () => this.#transcriptStats(workspaceId)),
      measure("deployments", async () => this.#deploymentStats(workspaceId)),
    ]);
    const memory = this.#memory();
    const cpu = this.#cpu();
    const result = {
      status: postgres.status === "ok" && redis.status === "ok" ? "ready" : "degraded",
      mode: "cpu_first",
      workspaceId,
      generatedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
      cpu,
      memory,
      process: {
        memory: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        uptimeSeconds: Math.round(process.uptime()),
      },
      checks: [postgres, redis, queues, ollamaTags, ollamaPs],
      enterprise: {
        api: apiStats,
        transcripts: transcriptStats,
        deployments: deploymentStats,
      },
      ollama: {
        baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
        installedModels: ollamaTags.data?.ok ? (ollamaTags.data.data?.models || []).map((model) => ({
          name: model.name,
          size: model.size || null,
          modifiedAt: model.modified_at || null,
        })) : [],
        activeModels: ollamaPs.data?.ok ? (ollamaPs.data.data?.models || []) : [],
        lowMemoryPolicy: {
          maxLoadedModels: Number(process.env.OLLAMA_MAX_LOADED_MODELS || 1),
          numParallel: Number(process.env.OLLAMA_NUM_PARALLEL || 1),
          keepAlive: process.env.OLLAMA_KEEP_ALIVE || "5m",
        },
      },
      recommendations: this.#recommendations({ memory, cpu }),
    };
    await this.eventBus?.publish?.({
      workspaceId,
      channel: `workspace:${workspaceId || "local-workspace"}`,
      type: "runtime.cpu.telemetry",
      payload: {
        status: result.status,
        loadAverage: cpu.loadAverage,
        memoryUsedPercent: memory.usedPercent,
        installedModels: result.ollama.installedModels.length,
      },
    });
    return result;
  }

  #cpu() {
    const cpus = os.cpus() || [];
    return {
      model: cpus[0]?.model || "unknown",
      cores: cpus.length,
      loadAverage: os.loadavg(),
      platform: os.platform(),
      arch: os.arch(),
    };
  }

  #memory() {
    const totalBytes = os.totalmem();
    const freeBytes = os.freemem();
    const usedBytes = Math.max(totalBytes - freeBytes, 0);
    return {
      totalBytes,
      freeBytes,
      usedBytes,
      usedPercent: totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 1000) / 10 : 0,
    };
  }

  #recommendations({ memory, cpu }) {
    return [
      Number(process.env.OLLAMA_MAX_LOADED_MODELS || 1) > 1 ? "Set OLLAMA_MAX_LOADED_MODELS=1 for low-memory CPU-first operation." : null,
      Number(process.env.OLLAMA_NUM_PARALLEL || 1) > 1 ? "Set OLLAMA_NUM_PARALLEL=1 on this laptop to avoid CPU/RAM spikes." : null,
      memory.usedPercent > 85 ? "Memory pressure is high. Prefer tinyllama or deepseek-coder and avoid concurrent model loads." : null,
      cpu.cores < 8 ? "Use short prompts, streaming responses, and background queues for heavier agent work." : null,
    ].filter(Boolean);
  }

  async #apiStats(workspaceId) {
    if (!this.pool) return { status: "not_configured" };
    const result = await this.pool.query(
      `select count(*)::int as requests,
              coalesce(round(avg(latency_ms))::int, 0) as avg_latency_ms,
              coalesce(max(latency_ms)::int, 0) as max_latency_ms
       from request_traces
       where workspace_id = $1 and created_at >= now() - interval '24 hours'`,
      [workspaceId]
    );
    return result.rows[0] || { requests: 0, avg_latency_ms: 0, max_latency_ms: 0 };
  }

  async #transcriptStats(workspaceId) {
    if (!this.pool) return { status: "not_configured" };
    const result = await this.pool.query(
      `select count(*)::int as total,
              count(*) filter (where status = 'completed')::int as completed,
              count(*) filter (where status = 'blocked')::int as blocked,
              count(*) filter (where created_at >= now() - interval '24 hours')::int as last_24h
       from multimodal_transcripts
       where workspace_id = $1`,
      [workspaceId]
    );
    return result.rows[0] || { total: 0, completed: 0, blocked: 0, last_24h: 0 };
  }

  async #deploymentStats(workspaceId) {
    if (!this.pool) return { status: "not_configured" };
    const result = await this.pool.query(
      `select count(*)::int as plans,
              count(*) filter (where status in ('validated', 'healthy'))::int as healthy,
              count(*) filter (where status in ('failed', 'degraded'))::int as degraded
       from deployment_plans
       where workspace_id = $1`,
      [workspaceId]
    );
    return result.rows[0] || { plans: 0, healthy: 0, degraded: 0 };
  }
}
