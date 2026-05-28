export class ProviderRegistry {
  constructor() {
    this.providers = new Map();
  }

  register(provider) {
    if (!provider?.providerName) {
      throw new Error("Cannot register provider without providerName.");
    }

    this.providers.set(provider.providerName, provider);
  }

  listProviders() {
    return [...this.providers.values()];
  }

  async findProviders({ capabilities, providerTypes, qualityTier }) {
    return [...this.providers.values()].filter((provider) => {
      const supportsCapabilities = capabilities.every((capability) => provider.capabilities?.includes(capability));
      const supportsType = providerTypes.includes(provider.providerType);
      const supportsTier = !qualityTier || provider.qualityTiers?.includes(qualityTier);
      return supportsCapabilities && supportsType && supportsTier;
    });
  }

  get(providerName) {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider is not registered: ${providerName}`);
    }
    return provider;
  }
}
