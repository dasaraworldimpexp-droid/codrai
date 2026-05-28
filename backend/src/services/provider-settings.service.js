import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";

const PROVIDERS = {
  openai: { label: "OpenAI", envName: "OPENAI_API_KEY", capabilities: ["chat", "coding", "image", "embeddings"] },
  anthropic: { label: "Anthropic Claude", envName: "ANTHROPIC_API_KEY", capabilities: ["chat", "reasoning", "long-context"] },
  gemini: { label: "Google Gemini", envName: "GEMINI_API_KEY", capabilities: ["chat", "reasoning", "vision"] },
  openrouter: { label: "OpenRouter", envName: "OPENROUTER_API_KEY", capabilities: ["chat", "routing", "multi-model", "streaming"] },
  grok: { label: "xAI Grok", envName: "XAI_API_KEY", capabilities: ["chat", "reasoning", "realtime", "streaming"] },
  groq: { label: "Groq", envName: "GROQ_API_KEY", capabilities: ["chat", "low-latency", "streaming"] },
  mistral: { label: "Mistral AI", envName: "MISTRAL_API_KEY", capabilities: ["chat", "reasoning", "structured-output", "streaming"] },
  deepseek: { label: "DeepSeek", envName: "DEEPSEEK_API_KEY", capabilities: ["chat", "coding", "reasoning", "streaming"] },
  together: { label: "Together AI", envName: "TOGETHER_API_KEY", capabilities: ["chat", "open-models", "streaming"] },
  ollama: { label: "Ollama Local", envName: "OLLAMA_API_KEY", capabilities: ["local-models", "chat", "streaming"] },
  fal: { label: "fal.ai", envName: "FAL_API_KEY", capabilities: ["image", "video"] },
  stability: { label: "Stability AI", envName: "STABILITY_API_KEY", capabilities: ["image"] },
  elevenlabs: { label: "ElevenLabs", envName: "ELEVENLABS_API_KEY", capabilities: ["voice", "speech"] },
};

function normalizeProvider(providerName) {
  return String(providerName || "").trim().toLowerCase();
}

function keyFromSecret() {
  const secret = process.env.PROVIDER_ENCRYPTION_KEY || process.env.JWT_SECRET || "codrai-local-provider-secret";
  return createHash("sha256").update(secret).digest();
}

export class ProviderSettingsService {
  constructor({ pool }) {
    this.pool = pool;
  }

  listSupportedProviders() {
    return Object.entries(PROVIDERS).map(([name, config]) => ({
      name,
      ...config,
      configuredFromEnvironment: Boolean(process.env[config.envName]),
    }));
  }

  async listSettings({ workspaceId }) {
    this.#assertPool();
    const result = await this.pool.query(
      `select provider_name, env_name, key_last4, status, last_checked_at, last_error, updated_at
       from provider_settings
       where workspace_id = $1
       order by provider_name asc`,
      [workspaceId]
    );
    const saved = new Map(result.rows.map((row) => [row.provider_name, row]));

    return this.listSupportedProviders().map((provider) => {
      const row = saved.get(provider.name);
      return {
        ...provider,
        configured: Boolean(row?.key_last4 || provider.configuredFromEnvironment),
        configuredInDatabase: Boolean(row?.key_last4),
        keyLast4: row?.key_last4 || (provider.configuredFromEnvironment ? "env" : null),
        status: row?.status || (provider.configuredFromEnvironment ? "environment" : "missing"),
        lastCheckedAt: row?.last_checked_at || null,
        lastError: row?.last_error || null,
        updatedAt: row?.updated_at || null,
      };
    });
  }

  async saveProviderKey({ workspaceId, userId, providerName, apiKey }) {
    this.#assertPool();
    const provider = normalizeProvider(providerName);
    const config = PROVIDERS[provider];
    if (!config) throw new Error(`Unsupported provider: ${providerName}`);
    if (!apiKey || apiKey.trim().length < 8) throw new Error(`${config.envName} must be a valid non-empty key.`);

    const encrypted = this.#encrypt(apiKey.trim());
    const keyLast4 = apiKey.trim().slice(-4);

    await this.pool.query(
      `insert into provider_settings
        (id, workspace_id, provider_name, env_name, encrypted_api_key, key_last4, status, created_by, updated_by, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, 'configured', $7, $7, now(), now())
       on conflict (workspace_id, provider_name)
       do update set encrypted_api_key = excluded.encrypted_api_key,
                     key_last4 = excluded.key_last4,
                     status = 'configured',
                     last_error = null,
                     updated_by = excluded.updated_by,
                     updated_at = now()`,
      [randomUUID(), workspaceId, provider, config.envName, encrypted, keyLast4, userId || null]
    );

    await this.recordAudit({
      workspaceId,
      userId,
      action: "provider.key.saved",
      targetType: "provider",
      targetId: provider,
      metadata: { envName: config.envName, keyLast4 },
    });

    return { provider, envName: config.envName, keyLast4, status: "configured" };
  }

  async removeProviderKey({ workspaceId, userId, providerName }) {
    this.#assertPool();
    const provider = normalizeProvider(providerName);
    await this.pool.query("delete from provider_settings where workspace_id = $1 and provider_name = $2", [workspaceId, provider]);
    await this.recordAudit({
      workspaceId,
      userId,
      action: "provider.key.removed",
      targetType: "provider",
      targetId: provider,
    });
    return { provider, status: "removed" };
  }

  async resolveApiKey({ workspaceId, providerName, envName }) {
    const environmentKey = process.env[envName];
    if (!this.pool || !workspaceId) return environmentKey;

    const provider = normalizeProvider(providerName);
    const result = await this.pool.query(
      `select encrypted_api_key
       from provider_settings
       where workspace_id = $1 and provider_name = $2
       limit 1`,
      [workspaceId, provider]
    );

    if (result.rows[0]?.encrypted_api_key) {
      return this.#decrypt(result.rows[0].encrypted_api_key);
    }

    return environmentKey;
  }

  async updateProviderHealth({ workspaceId, providerName, status, error }) {
    if (!this.pool || !workspaceId) return null;
    const provider = normalizeProvider(providerName);
    await this.pool.query(
      `update provider_settings
       set status = $3, last_error = $4, last_checked_at = now(), updated_at = now()
       where workspace_id = $1 and provider_name = $2`,
      [workspaceId, provider, status, error || null]
    );
    return { provider, status };
  }

  async recordAudit({ workspaceId, userId, action, targetType, targetId, metadata = {} }) {
    if (!this.pool) return null;
    await this.pool.query(
      `insert into audit_logs (id, workspace_id, user_id, action, target_type, target_id, metadata, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, now())`,
      [randomUUID(), workspaceId || null, userId || null, action, targetType || null, targetId || null, metadata]
    );
    return true;
  }

  #encrypt(value) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", keyFromSecret(), iv);
    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString("base64")}.${authTag.toString("base64")}.${encrypted.toString("base64")}`;
  }

  #decrypt(value) {
    const [ivRaw, authTagRaw, encryptedRaw] = value.split(".");
    const decipher = createDecipheriv("aes-256-gcm", keyFromSecret(), Buffer.from(ivRaw, "base64"));
    decipher.setAuthTag(Buffer.from(authTagRaw, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedRaw, "base64")),
      decipher.final(),
    ]).toString("utf8");
  }

  #assertPool() {
    if (!this.pool) throw new Error("Provider settings require PostgreSQL DATABASE_URL.");
  }
}

export { PROVIDERS as SUPPORTED_PROVIDER_SETTINGS };
