import { AI_CAPABILITIES, AI_QUALITY_TIERS } from "../../contracts/ai-task.contract.js";
import { ModelProvider } from "../../contracts/model-provider.contract.js";
import { env } from "../../config/env.js";
import { ProviderApiError, ProviderConfigurationError } from "../shared/provider-errors.js";

export class ElevenLabsProvider extends ModelProvider {
  constructor({ providerSettingsService } = {}) {
    super("elevenlabs");
    this.providerType = "voice";
    this.capabilities = [AI_CAPABILITIES.VOICE_SYNTHESIS, AI_CAPABILITIES.SPEECH_TO_TEXT];
    this.qualityTiers = [AI_QUALITY_TIERS.BALANCED, AI_QUALITY_TIERS.PREMIUM, AI_QUALITY_TIERS.ENTERPRISE];
    this.providerSettingsService = providerSettingsService;
  }

  async execute(task) {
    return this.generateVoice(task);
  }

  async generateVoice(task) {
    const apiKey = await this.#apiKey(task);
    const voiceId = task.input?.voiceId || process.env.ELEVENLABS_DEFAULT_VOICE_ID;
    if (!voiceId) throw new Error("Voice generation requires input.voiceId or ELEVENLABS_DEFAULT_VOICE_ID.");

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify({
        text: task.input?.text || task.intent,
        model_id: task.input?.modelId || "eleven_multilingual_v2",
        voice_settings: task.input?.voiceSettings,
      }),
    });

    if (!response.ok) throw new ProviderApiError(this.providerName, await response.text(), response.status);
    const audio = Buffer.from(await response.arrayBuffer());
    return {
      provider: this.providerName,
      output: { audioBase64: audio.toString("base64"), mimeType: "audio/mpeg" },
    };
  }

  async estimateCost() {
    return { estimatedCost: 0.03, estimatedLatencyMs: 2500 };
  }

  async healthCheck(context = {}) {
    const apiKey = await this.#apiKey(context);
    const response = await fetch("https://api.elevenlabs.io/v1/user", {
      headers: { "xi-api-key": apiKey },
    });
    if (!response.ok) throw new ProviderApiError(this.providerName, await response.text(), response.status);
    return { status: "ok", provider: this.providerName, verifiedBy: "user.account" };
  }

  async #apiKey(context = {}) {
    const apiKey = await this.providerSettingsService?.resolveApiKey?.({
      workspaceId: context.workspaceId,
      userId: context.userId,
      providerName: this.providerName,
      envName: "ELEVENLABS_API_KEY",
    }) || env.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY;

    if (!apiKey) throw new ProviderConfigurationError(this.providerName, "ELEVENLABS_API_KEY");
    return apiKey;
  }
}
