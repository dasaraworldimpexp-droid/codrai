export class ApiKeyVaultService {
  constructor({ secretStore, encryptionService }) {
    this.secretStore = secretStore;
    this.encryptionService = encryptionService;
  }

  async store({ workspaceId, provider, key, createdBy }) {
    const encrypted = await this.encryptionService.encrypt(key);
    return this.secretStore.put({
      workspaceId,
      name: `provider:${provider}`,
      encrypted,
      createdBy,
      createdAt: new Date().toISOString(),
    });
  }

  async resolve({ workspaceId, provider }) {
    const record = await this.secretStore.get({ workspaceId, name: `provider:${provider}` });
    if (!record) throw new Error(`Provider key is not configured for ${provider}`);
    return this.encryptionService.decrypt(record.encrypted);
  }
}
