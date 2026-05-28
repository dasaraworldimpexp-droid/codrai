import crypto from "node:crypto";

export class EmbeddingRuntimeService {
  constructor({ providerRegistry, providerSettingsService, dimensions = 1536 } = {}) {
    this.providerRegistry = providerRegistry;
    this.providerSettingsService = providerSettingsService;
    this.dimensions = dimensions;
    this.metrics = {
      requests: 0,
      failures: 0,
      totalLatencyMs: 0,
      lastProvider: null,
      lastLatencyMs: null,
      lastError: null,
      localFallbacks: 0,
    };
  }

  async embed({ text, workspaceId, userId, preferredProvider } = {}) {
    const input = String(text || "").slice(0, Number(process.env.EMBEDDING_MAX_INPUT_CHARS || 12000));
    const startedAt = Date.now();
    this.metrics.requests += 1;

    const providers = this.#providerOrder(preferredProvider);
    for (const provider of providers) {
      try {
        const embedding = await this.#embedWithProvider(provider, { text: input, workspaceId, userId });
        if (Array.isArray(embedding) && embedding.length > 0) {
          return this.#recordSuccess({ provider, embedding, startedAt });
        }
      } catch (error) {
        this.metrics.failures += 1;
        this.metrics.lastError = `${provider}: ${error.message}`;
      }
    }

    this.metrics.localFallbacks += 1;
    return this.#recordSuccess({
      provider: "codrai_local_hash_embedding_1536",
      embedding: this.localEmbedding(input),
      startedAt,
    });
  }

  snapshot() {
    return {
      ...this.metrics,
      avgLatencyMs: this.metrics.requests > 0 ? Math.round(this.metrics.totalLatencyMs / this.metrics.requests) : 0,
      dimensions: this.dimensions,
      fallback: "codrai_local_hash_embedding_1536",
    };
  }

  vectorLiteral(embedding) {
    return `[${this.#normalizeDimensions(embedding).join(",")}]`;
  }

  localEmbedding(text) {
    const vector = new Array(this.dimensions).fill(0);
    const tokens = String(text || "").toLowerCase().match(/[a-z0-9_:-]+/g) || [];
    for (const token of tokens.slice(0, 2500)) {
      const hash = crypto.createHash("sha256").update(token).digest();
      const index = hash.readUInt16BE(0) % vector.length;
      const sign = hash[2] % 2 === 0 ? 1 : -1;
      vector[index] += sign * (1 + Math.min(token.length, 32) / 32);
    }
    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
    return vector.map((value) => Number((value / norm).toFixed(6)));
  }

  #providerOrder(preferredProvider) {
    const localFirst = process.env.CODRAI_LOCAL_FIRST === "true" || process.env.EMBEDDING_PROVIDER === "ollama";
    const defaults = localFirst ? ["ollama", "openai", "gemini"] : ["openai", "gemini", "ollama"];
    return [...new Set([preferredProvider, process.env.EMBEDDING_PROVIDER, ...defaults].filter(Boolean))];
  }

  async #embedWithProvider(provider, context) {
    if (provider === "openai") return this.#openAiEmbedding(context);
    if (provider === "gemini") return this.#geminiEmbedding(context);
    if (provider === "ollama") return this.#ollamaEmbedding(context);
    return null;
  }

  async #openAiEmbedding({ text, workspaceId, userId }) {
    const openai = this.providerRegistry?.get?.("openai");
    if (!openai) throw new Error("OpenAI provider is not registered.");
    const result = await openai.embed({
      workspaceId,
      userId,
      input: { text },
    });
    return result.output.embedding;
  }

  async #geminiEmbedding({ text, workspaceId, userId }) {
    const apiKey = await this.providerSettingsService?.resolveApiKey?.({
      workspaceId,
      userId,
      providerName: "gemini",
      envName: "GEMINI_API_KEY",
    }) || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");
    const model = process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: { parts: [{ text }] } }),
    });
    if (!response.ok) throw new Error(await response.text());
    const result = await response.json();
    return result.embedding?.values;
  }

  async #ollamaEmbedding({ text }) {
    const baseUrl = (process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1").replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OLLAMA_EMBEDDING_MODEL || process.env.OLLAMA_MODEL || "tinyllama",
        input: text,
      }),
    });
    if (!response.ok) throw new Error(await response.text());
    const result = await response.json();
    return result.data?.[0]?.embedding || result.embedding;
  }

  #recordSuccess({ provider, embedding, startedAt }) {
    const latencyMs = Date.now() - startedAt;
    this.metrics.totalLatencyMs += latencyMs;
    this.metrics.lastProvider = provider;
    this.metrics.lastLatencyMs = latencyMs;
    return {
      provider,
      dimensions: this.dimensions,
      latencyMs,
      embedding: this.#normalizeDimensions(embedding),
    };
  }

  #normalizeDimensions(embedding) {
    const normalized = new Array(this.dimensions).fill(0);
    for (let index = 0; index < Math.min(embedding.length, this.dimensions); index += 1) {
      normalized[index] = Number(Number(embedding[index] || 0).toFixed(6));
    }
    const norm = Math.sqrt(normalized.reduce((sum, value) => sum + value * value, 0));
    if (!norm) return this.localEmbedding("");
    return normalized.map((value) => Number((value / norm).toFixed(6)));
  }
}
