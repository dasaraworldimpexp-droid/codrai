import { AI_CAPABILITIES, AI_QUALITY_TIERS } from "../../contracts/ai-task.contract.js";
import { ModelProvider } from "../../contracts/model-provider.contract.js";
import { ProviderApiError, ProviderConfigurationError } from "./provider-errors.js";

export class OpenAiCompatibleProvider extends ModelProvider {
  constructor({ providerName, providerType = "llm", apiKey, envName, baseUrl, defaultModel, authRequired = true, providerSettingsService }) {
    super(providerName);
    this.providerType = providerType;
    this.apiKey = apiKey;
    this.envName = envName;
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.defaultModel = defaultModel;
    this.authRequired = authRequired;
    this.providerSettingsService = providerSettingsService;
    this.capabilities = [AI_CAPABILITIES.TEXT, AI_CAPABILITIES.REASONING, AI_CAPABILITIES.STRUCTURED_OUTPUT, AI_CAPABILITIES.TOOL_USE];
    this.qualityTiers = Object.values(AI_QUALITY_TIERS);
  }

  async execute(task) {
    return this.generateText(task);
  }

  async generateText(task) {
    const apiKey = await this.#apiKey(task);
    const body = {
      model: task.model || this.defaultModel,
      messages: [
        { role: "system", content: task.systemPrompt || "You are CODRAI's execution model." },
        { role: "user", content: task.input?.text || task.intent || "" },
      ],
      temperature: task.temperature ?? 0.4,
      stream: false,
      ...this.#localOllamaOptions(),
    };
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.#headers(apiKey),
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new ProviderApiError(this.providerName, await response.text(), response.status);
    const result = await response.json();
    return {
      provider: this.providerName,
      model: result.model || task.model || this.defaultModel,
      output: { text: result.choices?.[0]?.message?.content || "" },
      usage: result.usage,
      raw: result,
    };
  }

  async *stream(task) {
    const apiKey = await this.#apiKey(task);
    const body = {
      model: task.model || this.defaultModel,
      messages: [
        { role: "system", content: task.systemPrompt || "You are CODRAI's execution model." },
        { role: "user", content: task.input?.text || task.intent || "" },
      ],
      temperature: task.temperature ?? 0.4,
      stream: true,
      ...this.#localOllamaOptions(),
    };
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.#headers(apiKey),
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new ProviderApiError(this.providerName, await response.text(), response.status);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ") || trimmed === "data: [DONE]") continue;
        const chunk = JSON.parse(trimmed.slice(6));
        const text = chunk.choices?.[0]?.delta?.content || "";
        if (text) yield { type: "token", text, raw: chunk };
      }
    }
  }

  async estimateCost(task) {
    return { estimatedCost: Math.max(JSON.stringify(task.input || {}).length / 4000, 1) * 0.0015, estimatedLatencyMs: 1000 };
  }

  async healthCheck(context = {}) {
    const apiKey = await this.#apiKey(context);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: "GET",
        headers: this.#headers(apiKey),
        signal: controller.signal,
      });
      if (!response.ok) throw new ProviderApiError(this.providerName, await response.text(), response.status);
      const result = await response.json();
      return {
        status: "ok",
        provider: this.providerName,
        baseUrl: this.baseUrl,
        verifiedBy: "models.list",
        sampleModel: result.data?.[0]?.id || result.models?.[0]?.name,
      };
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error(`${this.providerName} health check timed out at ${this.baseUrl}.`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  #headers(apiKey) {
    return {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    };
  }

  async #apiKey(context = {}) {
    const resolved = await this.providerSettingsService?.resolveApiKey?.({
      workspaceId: context.workspaceId,
      userId: context.userId,
      providerName: this.providerName,
      envName: this.envName,
    }) || this.apiKey || process.env[this.envName];

    if (this.authRequired && !resolved) throw new ProviderConfigurationError(this.providerName, this.envName);
    return resolved;
  }

  #localOllamaOptions() {
    if (this.providerName !== "ollama") return {};
    const options = {};
    const numCtx = Number(process.env.OLLAMA_NUM_CTX || 0);
    const numPredict = Number(process.env.OLLAMA_NUM_PREDICT || 0);
    const numThread = Number(process.env.OLLAMA_NUM_THREAD || 0);
    if (Number.isFinite(numCtx) && numCtx > 0) options.num_ctx = numCtx;
    if (Number.isFinite(numPredict) && numPredict > 0) options.num_predict = numPredict;
    if (Number.isFinite(numThread) && numThread > 0) options.num_thread = numThread;
    return Object.keys(options).length ? { options } : {};
  }
}
