import { AI_CAPABILITIES, AI_QUALITY_TIERS } from "../../contracts/ai-task.contract.js";
import { ModelProvider } from "../../contracts/model-provider.contract.js";
import { env } from "../../config/env.js";
import { HttpProviderClient } from "../shared/http-provider-client.js";

export class FalProvider extends ModelProvider {
  constructor({ providerSettingsService } = {}) {
    super("fal");
    this.providerType = "video";
    this.capabilities = [AI_CAPABILITIES.IMAGE_GENERATION, AI_CAPABILITIES.VIDEO_GENERATION];
    this.qualityTiers = [AI_QUALITY_TIERS.BALANCED, AI_QUALITY_TIERS.PREMIUM, AI_QUALITY_TIERS.ENTERPRISE];
    this.client = new HttpProviderClient({
      providerName: this.providerName,
      apiKey: env.falApiKey,
      envName: "FAL_API_KEY",
      baseUrl: "https://queue.fal.run",
      authPrefix: "Key",
      providerSettingsService,
    });
  }

  async execute(task) {
    return task.taskType === "video" ? this.generateVideo(task) : this.generateImage(task);
  }

  async generateImage(task) {
    const modelPath = task.input?.modelPath || process.env.FAL_IMAGE_MODEL_PATH || "/fal-ai/flux/dev";
    const result = await this.client.request(modelPath, {
      context: task,
      body: {
        prompt: task.input?.text || task.intent,
        image_size: task.input?.imageSize || "square_hd",
      },
    });
    return { provider: this.providerName, output: result, raw: result };
  }

  async generateVideo(task) {
    const modelPath = task.input?.modelPath || process.env.FAL_VIDEO_MODEL_PATH || "/fal-ai/kling-video/v1/standard/text-to-video";
    const result = await this.client.request(modelPath, {
      context: task,
      body: {
        prompt: task.input?.text || task.intent,
        image_url: task.input?.imageUrl,
      },
    });
    return { provider: this.providerName, output: result, raw: result };
  }

  async estimateCost(task) {
    return { estimatedCost: task.taskType === "video" ? 0.7 : 0.04, estimatedLatencyMs: task.taskType === "video" ? 30000 : 18000 };
  }

  async healthCheck(context = {}) {
    const apiKey = await this.client.assertConfigured(context);
    const response = await fetch("https://queue.fal.run/fal-ai/flux/dev/requests/codrai-health-check/status", {
      headers: { Authorization: `Key ${apiKey}` },
    });
    if (response.status === 401 || response.status === 403) {
      throw new Error(`fal provider rejected the configured key with HTTP ${response.status}.`);
    }
    return { status: "ok", provider: this.providerName, verifiedBy: "queue.status", httpStatus: response.status };
  }
}
