import { AI_CAPABILITIES, AI_QUALITY_TIERS } from "../../contracts/ai-task.contract.js";
import { ModelProvider } from "../../contracts/model-provider.contract.js";
import { env } from "../../config/env.js";
import { ProviderApiError, ProviderConfigurationError } from "../shared/provider-errors.js";

export class StabilityProvider extends ModelProvider {
  constructor({ providerSettingsService } = {}) {
    super("stability");
    this.providerType = "image";
    this.capabilities = [AI_CAPABILITIES.IMAGE_GENERATION];
    this.qualityTiers = [AI_QUALITY_TIERS.BALANCED, AI_QUALITY_TIERS.PREMIUM, AI_QUALITY_TIERS.ENTERPRISE];
    this.providerSettingsService = providerSettingsService;
  }

  async execute(task) {
    return this.generateImage(task);
  }

  async generateImage(task) {
    const apiKey = await this.#apiKey(task);

    const form = new FormData();
    form.append("prompt", task.input?.text || task.intent || "");
    form.append("output_format", task.input?.format || "png");
    form.append("aspect_ratio", task.input?.aspectRatio || "1:1");

    const response = await fetch("https://api.stability.ai/v2beta/stable-image/generate/core", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "image/*",
      },
      body: form,
    });

    if (!response.ok) {
      throw new ProviderApiError(this.providerName, await response.text(), response.status);
    }

    const image = Buffer.from(await response.arrayBuffer());

    return {
      provider: this.providerName,
      model: "stable-image-core",
      output: {
        imageBase64: image.toString("base64"),
        mimeType: response.headers.get("content-type") || "image/png",
      },
    };
  }

  async estimateCost() {
    return { estimatedCost: 0.04, estimatedLatencyMs: 18000 };
  }

  async healthCheck(context = {}) {
    const apiKey = await this.#apiKey(context);
    const response = await fetch("https://api.stability.ai/v1/user/account", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) throw new ProviderApiError(this.providerName, await response.text(), response.status);
    return { status: "ok", provider: this.providerName, verifiedBy: "user.account" };
  }

  async #apiKey(context = {}) {
    const apiKey = await this.providerSettingsService?.resolveApiKey?.({
      workspaceId: context.workspaceId,
      userId: context.userId,
      providerName: this.providerName,
      envName: "STABILITY_API_KEY",
    }) || env.stabilityApiKey || process.env.STABILITY_API_KEY;

    if (!apiKey) throw new ProviderConfigurationError(this.providerName, "STABILITY_API_KEY");
    return apiKey;
  }
}
