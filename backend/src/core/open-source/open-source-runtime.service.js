import { execFile } from "node:child_process";

const DEFAULT_TIMEOUT_MS = 1800;

function splitUrls(value, fallback) {
  return String(value || fallback)
    .split(",")
    .map((item) => item.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

function withTimeout(ms = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  return { controller, done: () => clearTimeout(timeout) };
}

export class OpenSourceRuntimeService {
  constructor({ providerRegistry, pool, redis, eventBus } = {}) {
    this.providerRegistry = providerRegistry;
    this.pool = pool;
    this.redis = redis;
    this.eventBus = eventBus;
  }

  async status({ workspaceId } = {}) {
    const [ollama, llamaCpp, vllm, comfyui, automatic1111, whisper, xtts, ffmpeg, gpu, memory, queues] = await Promise.all([
      this.#probeOllama(),
      this.#probeOpenAiCompatible("llama.cpp", "LLAMA_CPP_BASE_URL", "http://host.docker.internal:8080,http://localhost:8080"),
      this.#probeOpenAiCompatible("vLLM", "VLLM_BASE_URL", "http://host.docker.internal:8000,http://localhost:8000"),
      this.#probeJson("ComfyUI", "COMFYUI_BASE_URL", "http://host.docker.internal:8188,http://localhost:8188", "/system_stats"),
      this.#probeJson("Automatic1111", "AUTOMATIC1111_BASE_URL", "http://host.docker.internal:7860,http://localhost:7860", "/sdapi/v1/options"),
      this.#probeJson("Whisper", "WHISPER_BASE_URL", "http://host.docker.internal:9000,http://localhost:9000", "/health"),
      this.#probeJson("XTTS", "XTTS_BASE_URL", "http://host.docker.internal:8020,http://localhost:8020", "/health"),
      this.#command("ffmpeg", ["-version"]),
      this.gpu(),
      this.#memoryStatus(workspaceId),
      this.#queueStatus(),
    ]);

    const runtimes = [ollama, llamaCpp, vllm, comfyui, automatic1111, whisper, xtts, ffmpeg];
    const active = runtimes.filter((runtime) => runtime.status === "available").length;
    return {
      status: active > 0 ? "available" : "blocked",
      activeRuntimes: active,
      checkedAt: new Date().toISOString(),
      workspaceId: workspaceId || null,
      runtimes,
      models: this.#modelCatalog(ollama),
      gpu,
      memory,
      queues,
      orchestration: {
        runtimeManager: "wired",
        healthMonitor: "wired",
        queueSupervisor: queues.status === "ready" ? "ready" : "blocked",
        modelManager: ollama.status === "available" ? "ollama_ready" : "blocked",
        failover: "local_first_when_available",
        watchdog: "diagnostic_only",
      },
      recommendations: this.#recommendations(runtimes),
    };
  }

  async gpu() {
    return new Promise((resolve) => {
      execFile(
        "nvidia-smi",
        ["--query-gpu=name,memory.total,memory.used,utilization.gpu", "--format=csv,noheader,nounits"],
        { timeout: DEFAULT_TIMEOUT_MS },
        (error, stdout) => {
          if (error) {
            resolve({
              status: "blocked",
              vendor: "nvidia",
              reason: "nvidia-smi is not available in the backend runtime PATH, or no NVIDIA GPU is exposed to the container.",
              setup: "Install NVIDIA drivers and NVIDIA Container Toolkit, then run the backend with GPU passthrough for CUDA workloads.",
              devices: [],
            });
            return;
          }
          const devices = stdout
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line, index) => {
              const [name, memoryTotalMb, memoryUsedMb, utilizationPercent] = line.split(",").map((item) => item.trim());
              return { index, name, memoryTotalMb: Number(memoryTotalMb), memoryUsedMb: Number(memoryUsedMb), utilizationPercent: Number(utilizationPercent) };
            });
          resolve({ status: devices.length ? "available" : "blocked", vendor: "nvidia", devices });
        }
      );
    });
  }

  async pullOllamaModel({ workspaceId, userId, model }) {
    if (!model?.trim()) throw Object.assign(new Error("model is required."), { statusCode: 400 });
    const ollama = await this.#probeOllama();
    if (ollama.status !== "available") {
      throw Object.assign(new Error("Ollama is not reachable. Start Ollama before pulling local models."), { statusCode: 409 });
    }

    const apiUrl = ollama.baseUrl.endsWith("/v1") ? ollama.baseUrl.slice(0, -3) : ollama.baseUrl;
    const { controller, done } = withTimeout(Number(process.env.OLLAMA_PULL_TIMEOUT_MS || 30000));
    try {
      const response = await fetch(`${apiUrl}/api/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: model.trim(), stream: false }),
        signal: controller.signal,
      });
      if (!response.ok) throw Object.assign(new Error(await response.text()), { statusCode: response.status });
      const result = await response.json();
      await this.eventBus?.publish?.({
        type: "open_source.model.pull_completed",
        channel: `workspace:${workspaceId || "local-workspace"}`,
        workspaceId,
        actorId: userId,
        payload: { model: model.trim(), runtime: "ollama" },
      });
      return { status: "accepted", runtime: "ollama", model: model.trim(), result };
    } catch (error) {
      if (error.name === "AbortError") {
        throw Object.assign(new Error("Ollama model pull timed out."), { statusCode: 504 });
      }
      throw error;
    } finally {
      done();
    }
  }

  async #probeOllama() {
    const urls = this.#ollamaUrls();
    for (const baseUrl of urls) {
      const apiUrl = baseUrl.endsWith("/v1") ? baseUrl.slice(0, -3) : baseUrl;
      const probed = await this.#fetchJson(`${apiUrl}/api/tags`);
      if (probed.ok) {
        const models = (probed.data?.models || []).map((model) => ({
          name: model.name,
          size: model.size || null,
          modifiedAt: model.modified_at || null,
        }));
        return {
          name: "Ollama",
          key: "ollama",
          status: "available",
          baseUrl,
          endpoint: `${apiUrl}/api/tags`,
          models,
          modelCount: models.length,
          supports: ["chat", "streaming", "embeddings_if_model_available", "local_cpu_gpu"],
        };
      }
    }
    return {
      name: "Ollama",
      key: "ollama",
      status: "blocked",
      baseUrl: urls[0],
      reason: "Ollama was not reachable from the backend container.",
      setup: "Install/start Ollama and expose OLLAMA_BASE_URL=http://host.docker.internal:11434 for Docker Desktop, then pull a model such as llama3.1, qwen2.5-coder, deepseek-coder, mistral, gemma, phi, or codellama.",
      supports: ["chat", "streaming", "local_models"],
    };
  }

  #ollamaUrls() {
    return splitUrls(process.env.OLLAMA_BASE_URLS || process.env.OLLAMA_HOST || process.env.OLLAMA_BASE_URL, "http://host.docker.internal:11434,http://localhost:11434");
  }

  async #probeOpenAiCompatible(name, envName, fallback) {
    const urls = splitUrls(process.env[envName], fallback);
    for (const baseUrl of urls) {
      const probed = await this.#fetchJson(`${baseUrl.replace(/\/v1$/, "")}/v1/models`);
      if (probed.ok) {
        return {
          name,
          key: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          status: "available",
          baseUrl,
          endpoint: `${baseUrl.replace(/\/v1$/, "")}/v1/models`,
          models: probed.data?.data || probed.data?.models || [],
          supports: ["chat", "streaming", "openai_compatible"],
        };
      }
    }
    return {
      name,
      key: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      status: "blocked",
      baseUrl: urls[0],
      reason: `${name} OpenAI-compatible endpoint was not reachable.`,
      setup: `Start ${name} and set ${envName} to its reachable base URL.`,
      supports: ["chat", "streaming", "openai_compatible"],
    };
  }

  async #probeJson(name, envName, fallback, path) {
    const urls = splitUrls(process.env[envName], fallback);
    for (const baseUrl of urls) {
      const probed = await this.#fetchJson(`${baseUrl}${path}`);
      if (probed.ok) {
        return {
          name,
          key: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          status: "available",
          baseUrl,
          endpoint: `${baseUrl}${path}`,
          supports: this.#supportsFor(name),
          details: this.#safeSummary(probed.data),
        };
      }
    }
    return {
      name,
      key: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      status: "blocked",
      baseUrl: urls[0],
      reason: `${name} service was not reachable.`,
      setup: `Start ${name} and set ${envName} to its reachable base URL.`,
      supports: this.#supportsFor(name),
    };
  }

  async #fetchJson(url) {
    const { controller, done } = withTimeout();
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) return { ok: false, error: `${response.status} ${response.statusText}` };
      return { ok: true, data: await response.json() };
    } catch (error) {
      return { ok: false, error: error.name === "AbortError" ? "timeout" : error.message };
    } finally {
      done();
    }
  }

  #command(command, args) {
    return new Promise((resolve) => {
      execFile(command, args, { timeout: DEFAULT_TIMEOUT_MS }, (error, stdout) => {
        if (error) {
          resolve({
            name: command,
            key: command,
            status: "blocked",
            reason: `${command} is not available in the backend runtime PATH.`,
            setup: `Install ${command} in the backend image or mount an execution container that provides it.`,
            supports: ["media_pipeline"],
          });
          return;
        }
        resolve({
          name: command,
          key: command,
          status: "available",
          version: stdout.split("\n")[0],
          supports: ["audio_video_transcoding", "media_pipeline"],
        });
      });
    });
  }

  async #memoryStatus(workspaceId) {
    if (!this.pool) return { status: "blocked", reason: "PostgreSQL pool is unavailable." };
    try {
      const extension = await this.pool.query("select extversion from pg_extension where extname = 'vector'");
      const memoryCount = workspaceId
        ? await this.pool.query("select count(*)::int as count from ai_memories where workspace_id = $1", [workspaceId])
        : await this.pool.query("select count(*)::int as count from ai_memories");
      return {
        status: extension.rows.length ? "pgvector_ready" : "keyword_only",
        pgvector: Boolean(extension.rows.length),
        memories: memoryCount.rows[0]?.count || 0,
        embeddings: "open_source_embedding_runtime_detected_when_local_embedding_service_is_available",
      };
    } catch (error) {
      return { status: "blocked", reason: error.message };
    }
  }

  async #queueStatus() {
    if (!this.redis) return { status: "blocked", reason: "Redis is unavailable." };
    try {
      const pong = await this.redis.ping();
      return { status: "ready", redis: pong };
    } catch (error) {
      return { status: "blocked", reason: error.message };
    }
  }

  #modelCatalog(ollama) {
    const installed = new Set((ollama.models || []).map((model) => model.name));
    return [
      "tinyllama",
      "phi3-mini",
      "llama3.1",
      "deepseek-coder",
      "deepseek-r1",
      "mistral",
      "qwen2.5-coder",
      "qwen2.5",
      "phi3",
      "gemma2",
      "codellama",
      "nomic-embed-text",
      "mxbai-embed-large",
    ].map((name) => ({
      name,
      installed: installed.has(name) || [...installed].some((item) => item.startsWith(`${name}:`)),
      runtime: "ollama",
    }));
  }

  #supportsFor(name) {
    const normalized = name.toLowerCase();
    if (normalized.includes("comfy") || normalized.includes("automatic")) return ["image_generation", "sdxl", "stable_diffusion", "flux_if_installed"];
    if (normalized.includes("whisper")) return ["speech_to_text", "transcription"];
    if (normalized.includes("xtts")) return ["text_to_speech", "voice_cloning_if_configured"];
    return ["open_source_runtime"];
  }

  #safeSummary(data) {
    if (!data || typeof data !== "object") return {};
    return Object.fromEntries(Object.entries(data).slice(0, 8).map(([key, value]) => [key, typeof value === "object" ? Array.isArray(value) ? `array:${value.length}` : "object" : value]));
  }

  #recommendations(runtimes) {
    return runtimes
      .filter((runtime) => runtime.status !== "available")
      .map((runtime) => ({ runtime: runtime.name, action: runtime.setup || runtime.reason }))
      .slice(0, 8);
  }
}
