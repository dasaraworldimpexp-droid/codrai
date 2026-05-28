import { AI_CAPABILITIES, AI_QUALITY_TIERS } from "../../contracts/ai-task.contract.js";
import { ModelProvider } from "../../contracts/model-provider.contract.js";
import { env } from "../../config/env.js";
import { ProviderApiError, ProviderConfigurationError } from "../shared/provider-errors.js";

export class GeminiProvider extends ModelProvider {
  constructor({ providerSettingsService } = {}) {
    super("gemini");
    this.providerType = "llm";
    this.capabilities = [AI_CAPABILITIES.TEXT, AI_CAPABILITIES.REASONING, AI_CAPABILITIES.LONG_CONTEXT, AI_CAPABILITIES.STRUCTURED_OUTPUT, AI_CAPABILITIES.VISION];
    this.qualityTiers = Object.values(AI_QUALITY_TIERS);
    this.providerSettingsService = providerSettingsService;
  }

  async execute(task) {
    return this.generateText(task);
  }

  async generateText(task) {
    const apiKey = await this.#apiKey(task);
    const model = task.model || process.env.GEMINI_MODEL || "gemini-1.5-pro";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: this.#contents(task),
        generationConfig: { temperature: task.temperature ?? 0.4 },
      }),
    });

    if (!response.ok) throw new ProviderApiError(this.providerName, await response.text(), response.status);
    const result = await response.json();
    return {
      provider: this.providerName,
      model,
      output: { text: result.candidates?.[0]?.content?.parts?.map((part) => part.text).join("") || "" },
      usage: this.#usage(result.usageMetadata),
      raw: result,
    };
  }

  async *stream(task) {
    const apiKey = await this.#apiKey(task);
    const model = task.model || process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: this.#contents(task),
        generationConfig: { temperature: task.temperature ?? 0.4 },
      }),
    });

    if (!response.ok) throw new ProviderApiError(this.providerName, await response.text(), response.status);
    const text = await response.text();
    const chunks = this.#parseStreamResponse(text);
    for (const chunk of chunks) {
      const token = chunk.candidates?.[0]?.content?.parts?.map((part) => part.text).join("") || "";
      if (token) yield { type: "token", text: token, usage: this.#usage(chunk.usageMetadata), raw: chunk };
    }
  }

  async estimateCost(task) {
    return { estimatedCost: Math.max(JSON.stringify(task.input || {}).length / 4000, 1) * 0.002, estimatedLatencyMs: 1200 };
  }

  async healthCheck(context = {}) {
    const apiKey = await this.#apiKey(context);
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!response.ok) throw new ProviderApiError(this.providerName, await response.text(), response.status);
    const result = await response.json();
    return { status: "ok", provider: this.providerName, verifiedBy: "models.list", sampleModel: result.models?.[0]?.name };
  }

  async #apiKey(context = {}) {
    const apiKey = await this.providerSettingsService?.resolveApiKey?.({
      workspaceId: context.workspaceId,
      userId: context.userId,
      providerName: this.providerName,
      envName: "GEMINI_API_KEY",
    }) || env.geminiApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) throw new ProviderConfigurationError(this.providerName, "GEMINI_API_KEY");
    return apiKey;
  }

  #contents(task) {
    const parts = [];
    const text = [
      task.context?.system || task.systemPrompt,
      task.context?.blocks?.map((block) => `${block.type}: ${JSON.stringify(block.content)}`).join("\n"),
      task.input?.text || task.intent || "",
    ].filter(Boolean).join("\n\n");
    if (text) parts.push({ text });
    for (const image of task.input?.images || []) {
      if (image.dataBase64 && image.mimeType) {
        parts.push({ inline_data: { mime_type: image.mimeType, data: image.dataBase64 } });
      }
    }
    for (const file of task.input?.files || []) {
      if (file.text) {
        parts.push({ text: `File: ${file.name || "document"}\n${file.text}` });
      }
    }
    return [{ parts: parts.length ? parts : [{ text: task.intent || "Execute CODRAI request." }] }];
  }

  #usage(usageMetadata = {}) {
    return {
      prompt_tokens: usageMetadata.promptTokenCount || 0,
      completion_tokens: usageMetadata.candidatesTokenCount || 0,
      total_tokens: usageMetadata.totalTokenCount || 0,
    };
  }

  #parseStreamResponse(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return trimmed
        .split(/\r?\n/)
        .map((line) => line.replace(/^data:\s*/, "").trim())
        .filter((line) => line && line !== "[DONE]")
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter(Boolean);
    }
  }
}
