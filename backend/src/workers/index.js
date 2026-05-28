import dotenv from "dotenv";
import { QUEUE_NAMES } from "../core/queues/queue-names.js";
import { BullMqWorkerRuntime } from "../core/queues/bullmq-worker-runtime.js";
import { createRedisClient } from "../config/redis.js";
import { createPostgresPool } from "../config/postgres.js";
import { PostgresJobRepository } from "../repositories/postgres-job.repository.js";
import { ProviderRegistry } from "../providers/provider-registry.js";
import { OpenAiProvider } from "../providers/openai/openai.provider.js";
import { AnthropicProvider } from "../providers/anthropic/anthropic.provider.js";
import { GeminiProvider } from "../providers/gemini/gemini.provider.js";
import { ElevenLabsProvider } from "../providers/elevenlabs/elevenlabs.provider.js";
import { FalProvider } from "../providers/fal/fal.provider.js";
import { StabilityProvider } from "../providers/stability/stability.provider.js";
import { OpenAiCompatibleProvider } from "../providers/shared/openai-compatible.provider.js";
import { AiProviderRuntime } from "../core/provider-runtime/ai-provider-runtime.js";
import { ProviderSettingsService } from "../services/provider-settings.service.js";
import { MultimodalCapabilityService } from "../core/multimodal/multimodal-capability.service.js";

dotenv.config();

const redis = createRedisClient();
const pool = createPostgresPool();

if (!redis) {
  throw new Error("Worker requires REDIS_URL.");
}

const providerRegistry = new ProviderRegistry();
const providerSettingsService = new ProviderSettingsService({ pool });
[
  new OpenAiProvider({ providerSettingsService }),
  new AnthropicProvider({ providerSettingsService }),
  new GeminiProvider({ providerSettingsService }),
  new ElevenLabsProvider({ providerSettingsService }),
  new FalProvider({ providerSettingsService }),
  new StabilityProvider({ providerSettingsService }),
  new OpenAiCompatibleProvider({ providerName: "openrouter", apiKey: process.env.OPENROUTER_API_KEY, envName: "OPENROUTER_API_KEY", baseUrl: "https://openrouter.ai/api/v1", defaultModel: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini", providerSettingsService }),
  new OpenAiCompatibleProvider({ providerName: "grok", apiKey: process.env.XAI_API_KEY, envName: "XAI_API_KEY", baseUrl: "https://api.x.ai/v1", defaultModel: process.env.XAI_MODEL || "grok-4", providerSettingsService }),
  new OpenAiCompatibleProvider({ providerName: "groq", apiKey: process.env.GROQ_API_KEY, envName: "GROQ_API_KEY", baseUrl: "https://api.groq.com/openai/v1", defaultModel: process.env.GROQ_MODEL || "llama-3.1-70b-versatile", providerSettingsService }),
  new OpenAiCompatibleProvider({ providerName: "mistral", apiKey: process.env.MISTRAL_API_KEY, envName: "MISTRAL_API_KEY", baseUrl: "https://api.mistral.ai/v1", defaultModel: process.env.MISTRAL_MODEL || "mistral-large-latest", providerSettingsService }),
  new OpenAiCompatibleProvider({ providerName: "deepseek", apiKey: process.env.DEEPSEEK_API_KEY, envName: "DEEPSEEK_API_KEY", baseUrl: "https://api.deepseek.com/v1", defaultModel: process.env.DEEPSEEK_MODEL || "deepseek-chat", providerSettingsService }),
  new OpenAiCompatibleProvider({ providerName: "together", apiKey: process.env.TOGETHER_API_KEY, envName: "TOGETHER_API_KEY", baseUrl: "https://api.together.xyz/v1", defaultModel: process.env.TOGETHER_MODEL || "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo", providerSettingsService }),
  new OpenAiCompatibleProvider({ providerName: "ollama", apiKey: process.env.OLLAMA_API_KEY, envName: "OLLAMA_API_KEY", baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1", defaultModel: process.env.OLLAMA_MODEL || "tinyllama", authRequired: false, providerSettingsService }),
].forEach((provider) => providerRegistry.register(provider));

const providerRuntime = new AiProviderRuntime({
  retryPolicy: {
    maxAttempts: Number(process.env.PROVIDER_MAX_ATTEMPTS || 2),
    baseDelayMs: Number(process.env.PROVIDER_RETRY_BASE_DELAY_MS || 750),
  },
  timeoutMs: Number(process.env.PROVIDER_TIMEOUT_MS || 120000),
});
const aiHandler = async ({ task, route }) => {
  const provider = providerRegistry.get(route.providerName);
  return providerRuntime.execute({ provider, task });
};

const multimodalService = new MultimodalCapabilityService({ pool });
const transcriptionHandler = async ({ workspaceId, projectId, userId, file }) => {
  if (!file?.bufferBase64) throw new Error("Transcription worker requires a base64 encoded file payload.");
  return multimodalService.transcribeAudio({
    workspaceId,
    projectId,
    userId,
    file: {
      originalname: file.originalname,
      mimetype: file.mimetype,
      buffer: Buffer.from(file.bufferBase64, "base64"),
    },
  });
};

const handlers = new Map([
  [QUEUE_NAMES.AI_TEXT, aiHandler],
  [QUEUE_NAMES.AI_IMAGE, aiHandler],
  [QUEUE_NAMES.AI_VIDEO, aiHandler],
  [QUEUE_NAMES.AI_VOICE, aiHandler],
  [QUEUE_NAMES.MULTIMODAL_TRANSCRIPTION, transcriptionHandler],
  [QUEUE_NAMES.DOCUMENT_GENERATION, aiHandler],
  [QUEUE_NAMES.PRESENTATION_GENERATION, aiHandler],
  [QUEUE_NAMES.AGENT_EXECUTION, aiHandler],
  [QUEUE_NAMES.ECOMMERCE_SYNC, aiHandler],
  [QUEUE_NAMES.EXPORT_RENDER, aiHandler],
  [QUEUE_NAMES.NOTIFICATION_DELIVERY, async ({ notification }) => {
    if (!notification) throw new Error("Notification worker requires notification payload.");
    return { delivered: false, reason: "No notification channel adapter configured for this workspace." };
  }],
]);

const runtime = new BullMqWorkerRuntime({
  connection: redis,
  handlers,
  jobRepository: new PostgresJobRepository(pool),
});

runtime.start(Object.values(QUEUE_NAMES));
console.log("CODRAI workers started.");
