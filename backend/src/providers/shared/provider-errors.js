export class ProviderConfigurationError extends Error {
  constructor(providerName, envName) {
    super(`${providerName} provider is not configured. Set ${envName}.`);
    this.name = "ProviderConfigurationError";
    this.providerName = providerName;
    this.envName = envName;
  }
}

export class ProviderApiError extends Error {
  constructor(providerName, responseText, status) {
    super(`${providerName} API error ${status}: ${responseText}`);
    this.name = "ProviderApiError";
    this.providerName = providerName;
    this.status = status;
    this.retryable = status >= 500 || status === 429;
  }
}
