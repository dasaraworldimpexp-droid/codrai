import OpenAI from "openai";
import { AI_CAPABILITIES, AI_QUALITY_TIERS, AI_TASK_TYPES } from "../../contracts/ai-task.contract.js";
import { ModelProvider } from "../../contracts/model-provider.contract.js";
import { env } from "../../config/env.js";
import { ProviderConfigurationError } from "../shared/provider-errors.js";

export class OpenAiProvider extends ModelProvider {
  constructor({ providerSettingsService } = {}) {
    super("openai");
    this.providerType = "llm";
    this.capabilities = [
      AI_CAPABILITIES.TEXT,
      AI_CAPABILITIES.REASONING,
      AI_CAPABILITIES.TOOL_USE,
      AI_CAPABILITIES.STRUCTURED_OUTPUT,
      AI_CAPABILITIES.VISION,
      AI_CAPABILITIES.IMAGE_GENERATION,
      AI_CAPABILITIES.EMBEDDINGS,
    ];
    this.qualityTiers = Object.values(AI_QUALITY_TIERS);
    this.providerSettingsService = providerSettingsService;
    this.clientCache = new Map();
  }

  async execute(task) {
    if (task.taskType === AI_TASK_TYPES.IMAGE) {
      return this.generateImage(task);
    }

    if (task.requiredCapabilities?.includes(AI_CAPABILITIES.EMBEDDINGS)) {
      return this.embed(task);
    }

    return this.generateText(task);
  }

  async generateText(task) {
    const client = await this.#client(task);

    const completion = await client.chat.completions.create({
      model: this.#modelForTask(task),
      messages: this.#messages(task),
      temperature: task.temperature ?? 0.4,
      response_format: task.outputContract?.json === true ? { type: "json_object" } : undefined,
    });

    return {
      provider: this.providerName,
      model: completion.model,
      output: { text: completion.choices[0]?.message?.content || "" },
      usage: completion.usage,
      raw: completion,
    };
  }

  async *stream(task) {
    const client = await this.#client(task);

    const stream = await client.chat.completions.create({
      model: this.#modelForTask(task),
      messages: this.#messages(task),
      temperature: task.temperature ?? 0.4,
      stream: true,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || "";
      if (text) {
        yield { type: "token", text, raw: chunk };
      }
    }
  }

  async generateImage(task) {
    const client = await this.#client(task);

    const image = await client.images.generate({
      model: env.defaultImageModel,
      prompt: task.input?.text || task.intent,
      size: task.input?.size || "1024x1024",
      quality: task.input?.quality || "standard",
      n: task.input?.n || 1,
    });

    return {
      provider: this.providerName,
      model: env.defaultImageModel,
      output: { images: image.data },
      raw: image,
    };
  }

  async embed(task) {
    const client = await this.#client(task);

    const response = await client.embeddings.create({
      model: env.defaultEmbeddingModel,
      input: task.input?.text || task.intent || "",
    });

    return {
      provider: this.providerName,
      model: env.defaultEmbeddingModel,
      output: { embedding: response.data[0].embedding },
      usage: response.usage,
      raw: response,
    };
  }

  async estimateCost(task) {
    const text = JSON.stringify(task.input || {}).length;
    return {
      estimatedCost: task.taskType === AI_TASK_TYPES.IMAGE ? 0.05 : Math.max(text / 4000, 1) * 0.003,
      estimatedLatencyMs: task.taskType === AI_TASK_TYPES.IMAGE ? 15000 : 900,
    };
  }

  async healthCheck(context = {}) {
    const client = await this.#client(context);
    const models = await client.models.list();
    return { status: "ok", provider: this.providerName, verifiedBy: "models.list", sampleModel: models.data?.[0]?.id };
  }

  #messages(task) {
    const system = task.context?.system || task.systemPrompt || "You are CODRAI, a production AI operating system executor.";
    const contextBlocks = task.context?.blocks?.map((block) => `${block.type}: ${JSON.stringify(block.content)}`).join("\n") || "";
    const userContent = this.#userContent(task);
    return [
      { role: "system", content: [system, contextBlocks].filter(Boolean).join("\n\n") },
      { role: "user", content: userContent },
    ];
  }

  #userContent(task) {
    const text = [
      task.input?.text || task.intent || "",
      ...(task.input?.files || []).map((file) => file.text ? `File: ${file.name || "document"}\n${file.text}` : ""),
    ].filter(Boolean).join("\n\n");
    const images = (task.input?.images || [])
      .filter((image) => image.dataBase64 && image.mimeType)
      .map((image) => ({
        type: "image_url",
        image_url: { url: `data:${image.mimeType};base64,${image.dataBase64}` },
      }));
    if (images.length === 0) return text;
    return [{ type: "text", text: text || "Analyze the attached image." }, ...images];
  }

  #modelForTask(task) {
    if (task.taskType === AI_TASK_TYPES.CODING) return env.defaultCodingModel;
    return task.model || env.defaultTextModel;
  }

  async #apiKey(context = {}) {
    const apiKey = await this.providerSettingsService?.resolveApiKey?.({
      workspaceId: context.workspaceId,
      userId: context.userId,
      providerName: this.providerName,
      envName: "OPENAI_API_KEY",
    }) || env.openaiApiKey || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new ProviderConfigurationError(this.providerName, "OPENAI_API_KEY");
    }

    return apiKey;
  }

  async #client(context = {}) {
    const apiKey = await this.#apiKey(context);
    const cacheKey = `${context.workspaceId || "env"}:${apiKey.slice(-8)}`;
    if (!this.clientCache.has(cacheKey)) {
      this.clientCache.set(cacheKey, new OpenAI({
        apiKey,
        timeout: Number(process.env.PROVIDER_HTTP_TIMEOUT_MS || 30000),
        maxRetries: Number(process.env.OPENAI_SDK_MAX_RETRIES || 1),
      }));
    }
    return this.clientCache.get(cacheKey);
  }
}
