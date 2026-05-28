import { ProviderApiError, ProviderConfigurationError } from "./provider-errors.js";

export class HttpProviderClient {
  constructor({ providerName, apiKey, envName, baseUrl, authHeader = "Authorization", authPrefix = "Bearer", providerSettingsService, timeoutMs = Number(process.env.PROVIDER_HTTP_TIMEOUT_MS || 30000) }) {
    this.providerName = providerName;
    this.apiKey = apiKey;
    this.envName = envName;
    this.baseUrl = baseUrl;
    this.authHeader = authHeader;
    this.authPrefix = authPrefix;
    this.providerSettingsService = providerSettingsService;
    this.timeoutMs = timeoutMs;
  }

  async resolveApiKey(context = {}) {
    return this.providerSettingsService?.resolveApiKey?.({
      workspaceId: context.workspaceId,
      userId: context.userId,
      providerName: this.providerName,
      envName: this.envName,
    }) || this.apiKey || process.env[this.envName];
  }

  async assertConfigured(context = {}) {
    const apiKey = await this.resolveApiKey(context);
    if (!apiKey) {
      throw new ProviderConfigurationError(this.providerName, this.envName);
    }
    return apiKey;
  }

  async request(path, { method = "POST", headers = {}, body, context } = {}) {
    const apiKey = await this.assertConfigured(context);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          [this.authHeader]: this.authHeader === "Authorization" ? `${this.authPrefix} ${apiKey}` : apiKey,
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new ProviderApiError(this.providerName, await response.text(), response.status);
      }

      return response.json();
    } catch (error) {
      if (error.name === "AbortError") {
        const timeoutError = new Error(`${this.providerName} request timed out after ${this.timeoutMs}ms.`);
        timeoutError.code = "ETIMEDOUT";
        timeoutError.retryable = true;
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
