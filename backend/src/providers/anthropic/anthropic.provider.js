import { AI_CAPABILITIES, AI_QUALITY_TIERS } from "../../contracts/ai-task.contract.js";
import { ModelProvider } from "../../contracts/model-provider.contract.js";
import { env } from "../../config/env.js";
import { HttpProviderClient } from "../shared/http-provider-client.js";

export class AnthropicProvider extends ModelProvider {
  constructor({ providerSettingsService } = {}) {
    super("anthropic");
    this.providerType = "llm";
    this.capabilities = [AI_CAPABILITIES.TEXT, AI_CAPABILITIES.REASONING, AI_CAPABILITIES.LONG_CONTEXT, AI_CAPABILITIES.STRUCTURED_OUTPUT];
    this.qualityTiers = [AI_QUALITY_TIERS.BALANCED, AI_QUALITY_TIERS.PREMIUM, AI_QUALITY_TIERS.ENTERPRISE];
    this.client = new HttpProviderClient({
      providerName: this.providerName,
      apiKey: env.anthropicApiKey,
      envName: "ANTHROPIC_API_KEY",
      baseUrl: "https://api.anthropic.com/v1",
      authHeader: "x-api-key",
      providerSettingsService,
    });
  }

  async execute(task) {
    return this.generateText(task);
  }

  async generateText(task) {
    const result = await this.client.request("/messages", {
      context: task,
      headers: {
        "anthropic-version": "2023-06-01",
      },
      body: {
        model: task.model || process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest",
        max_tokens: task.maxTokens || 2048,
        system: task.systemPrompt || "You are CODRAI's reasoning provider.",
        messages: [{ role: "user", content: task.input?.text || task.intent || "" }],
      },
    });

    return {
      provider: this.providerName,
      model: result.model,
      output: { text: result.content?.map((part) => part.text).join("") || "" },
      usage: result.usage,
      raw: result,
    };
  }

  async estimateCost(task) {
    return { estimatedCost: Math.max(JSON.stringify(task.input || {}).length / 4000, 1) * 0.006, estimatedLatencyMs: 1400 };
  }

  async healthCheck(context = {}) {
    const result = await this.client.request("/models?limit=1", {
      method: "GET",
      context,
      headers: { "anthropic-version": "2023-06-01" },
    });
    return { status: "ok", provider: this.providerName, verifiedBy: "models.list", sampleModel: result.data?.[0]?.id };
  }
}
