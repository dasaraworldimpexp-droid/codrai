export class ModelProvider {
  constructor(providerName) {
    if (!providerName) {
      throw new Error("ModelProvider requires a providerName.");
    }

    this.providerName = providerName;
  }

  async generateText() {
    throw new Error(`${this.providerName}.generateText is not implemented.`);
  }

  async execute() {
    throw new Error(`${this.providerName}.execute is not implemented.`);
  }

  async generateImage() {
    throw new Error(`${this.providerName}.generateImage is not implemented.`);
  }

  async generateVideo() {
    throw new Error(`${this.providerName}.generateVideo is not implemented.`);
  }

  async generateVoice() {
    throw new Error(`${this.providerName}.generateVoice is not implemented.`);
  }

  async embed() {
    throw new Error(`${this.providerName}.embed is not implemented.`);
  }

  async estimateCost() {
    throw new Error(`${this.providerName}.estimateCost is not implemented.`);
  }

  async healthCheck() {
    throw new Error(`${this.providerName}.healthCheck is not implemented.`);
  }
}
