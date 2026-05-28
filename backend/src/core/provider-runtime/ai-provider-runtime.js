export class AiProviderRuntime {
  constructor({ retryPolicy, telemetry, timeoutMs = 120000 }) {
    this.retryPolicy = retryPolicy || { maxAttempts: 2, baseDelayMs: 350 };
    this.telemetry = telemetry;
    this.timeoutMs = timeoutMs;
  }

  async execute({ provider, task, signal, fallbackProviders = [] }) {
    const providers = [provider, ...fallbackProviders];
    let lastError;

    for (const candidate of providers) {
      const startedAt = Date.now();
      try {
        const result = await this.#withRetry(() => this.#withTimeout(candidate.execute(task, { signal }), signal), {
          providerName: candidate.providerName,
          taskId: task.id,
        });
        const latencyMs = Date.now() - startedAt;
        await this.telemetry?.recordProviderSuccess?.({
          providerName: candidate.providerName,
          taskId: task.id,
          latencyMs,
        });
        return { ...result, provider: result.provider || candidate.providerName, latencyMs, taskType: task.taskType };
      } catch (error) {
        lastError = error;
        await this.telemetry?.recordProviderError?.({
          providerName: candidate.providerName,
          taskId: task.id,
          error,
          timeout: error.code === "ETIMEDOUT" || error.message?.includes("timed out"),
        });
        await this.telemetry?.recordProviderFailover?.({
          providerName: candidate.providerName,
          taskId: task.id,
          error,
        });
      }
    }

    throw lastError;
  }

  async *stream({ provider, task, signal, fallbackProviders = [] }) {
    const providers = [provider, ...fallbackProviders];
    let lastError;

    for (const candidate of providers) {
      const startedAt = Date.now();
      try {
        if (typeof candidate.stream === "function") {
          const stream = await this.#withRetry(() => candidate.stream(task, { signal }), {
            providerName: candidate.providerName,
            taskId: task.id,
          });

          for await (const chunk of stream) {
            yield this.#normalizeChunk(chunk, candidate.providerName);
          }
          await this.telemetry?.recordProviderSuccess?.({
            providerName: candidate.providerName,
            taskId: task.id,
            latencyMs: Date.now() - startedAt,
          });
          return;
        }

        const result = await this.#withRetry(() => this.#withTimeout(candidate.execute(task, { signal }), signal), {
          providerName: candidate.providerName,
          taskId: task.id,
        });
          const text = result.output?.text || "";
          if (text) {
          yield this.#normalizeChunk({ type: "token", text, usage: result.usage, raw: result.raw }, candidate.providerName);
        }
        await this.telemetry?.recordProviderSuccess?.({
          providerName: candidate.providerName,
          taskId: task.id,
          latencyMs: Date.now() - startedAt,
        });
        return;
      } catch (error) {
        lastError = error;
        await this.telemetry?.recordProviderError?.({
          providerName: candidate.providerName,
          taskId: task.id,
          error,
          timeout: error.code === "ETIMEDOUT" || error.message?.includes("timed out"),
          streamingInterrupted: true,
        });
        await this.telemetry?.recordProviderFailover?.({
          providerName: candidate.providerName,
          taskId: task.id,
          error,
        });
      }
    }

    throw lastError;
  }

  async #withRetry(operation, metadata) {
    let lastError;

    for (let attempt = 1; attempt <= this.retryPolicy.maxAttempts; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        await this.telemetry?.recordProviderError?.({ ...metadata, attempt, error });
        if (attempt > 1) {
          await this.telemetry?.recordProviderRetry?.({ ...metadata, attempt, error });
        }

        if (attempt >= this.retryPolicy.maxAttempts || !this.#isRetryable(error)) {
          break;
        }

        await this.#delay(this.retryPolicy.baseDelayMs * attempt);
      }
    }

    throw lastError;
  }

  #withTimeout(promise, signal) {
    if (signal?.aborted) {
      throw new Error("AI provider execution cancelled.");
    }

    return Promise.race([
      promise,
      new Promise((_, reject) => {
        const timeout = setTimeout(() => reject(new Error("AI provider execution timed out.")), this.timeoutMs);
        signal?.addEventListener?.("abort", () => {
          clearTimeout(timeout);
          reject(new Error("AI provider execution cancelled."));
        });
      }),
    ]);
  }

  #normalizeChunk(chunk, providerName) {
    return {
      providerName,
      type: chunk.type || "token",
      text: chunk.text || "",
      delta: chunk.delta,
      usage: chunk.usage,
      raw: chunk.raw,
      createdAt: new Date().toISOString(),
    };
  }

  #isRetryable(error) {
    return ["ETIMEDOUT", "ECONNRESET", "EAI_AGAIN"].includes(error.code) || error.retryable === true || error.status >= 500;
  }

  #delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
