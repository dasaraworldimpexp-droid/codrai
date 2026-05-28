import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

export const CODRAI_API_SCOPES = [
  "chat:read",
  "chat:write",
  "models:read",
  "stream:write",
  "admin:read",
  "analytics:read",
];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function maskSecret(last4) {
  return `sk_codrai_${"*".repeat(24)}${last4}`;
}

function normalizeScopes(scopes = []) {
  const unique = [...new Set(scopes)];
  const invalid = unique.filter((scope) => !CODRAI_API_SCOPES.includes(scope));
  if (invalid.length) {
    throw new Error(`Unsupported API scopes: ${invalid.join(", ")}`);
  }
  return unique.length ? unique : ["chat:write", "models:read"];
}

export class DeveloperApiKeyService {
  constructor({ pool }) {
    this.pool = pool;
  }

  async createKey({ workspaceId, userId, name, scopes, expiresAt, metadata = {} }) {
    this.#assertPool();
    if (!workspaceId) throw new Error("workspaceId is required.");
    const id = randomUUID();
    const publicKey = `pk_codrai_${randomBytes(18).toString("base64url")}`;
    const secretKey = `sk_codrai_${randomBytes(32).toString("base64url")}`;
    const secretHash = sha256(secretKey);
    const normalizedScopes = normalizeScopes(scopes);

    await this.pool.query(
      `insert into developer_api_keys
        (id, workspace_id, user_id, name, public_key, secret_key_hash, secret_key_last4, scopes, expires_at, metadata, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now())`,
      [id, workspaceId, userId || null, name || "CODRAI API Key", publicKey, secretHash, secretKey.slice(-4), normalizedScopes, expiresAt || null, metadata]
    );

    await this.#audit({ workspaceId, userId, action: "developer.api_key.created", targetId: id, metadata: { scopes: normalizedScopes } });
    return {
      key: {
        id,
        name: name || "CODRAI API Key",
        publicKey,
        secretKey,
        secretKeyMasked: maskSecret(secretKey.slice(-4)),
        scopes: normalizedScopes,
        status: "active",
        expiresAt: expiresAt || null,
      },
      warning: "Store this secret key now. CODRAI will not show it again.",
    };
  }

  async listKeys({ workspaceId }) {
    this.#assertPool();
    const result = await this.pool.query(
      `select id, workspace_id, user_id, name, public_key, secret_key_last4, scopes, status, expires_at, last_used_at, usage_count, metadata, created_at, updated_at, revoked_at
       from developer_api_keys
       where workspace_id = $1
       order by created_at desc`,
      [workspaceId]
    );
    return result.rows.map((row) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      userId: row.user_id,
      name: row.name,
      publicKey: row.public_key,
      secretKeyMasked: maskSecret(row.secret_key_last4),
      scopes: row.scopes || [],
      status: row.status,
      expiresAt: row.expires_at,
      lastUsedAt: row.last_used_at,
      usageCount: Number(row.usage_count || 0),
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      revokedAt: row.revoked_at,
    }));
  }

  async revokeKey({ workspaceId, userId, keyId }) {
    this.#assertPool();
    const result = await this.pool.query(
      `update developer_api_keys
       set status = 'revoked', revoked_at = now(), updated_at = now()
       where id = $1 and workspace_id = $2 and status <> 'revoked'
       returning id`,
      [keyId, workspaceId]
    );
    if (!result.rows[0]) throw Object.assign(new Error("API key not found or already revoked."), { statusCode: 404 });
    await this.#audit({ workspaceId, userId, action: "developer.api_key.revoked", targetId: keyId });
    return { id: keyId, status: "revoked" };
  }

  async rotateKey({ workspaceId, userId, keyId }) {
    this.#assertPool();
    const current = await this.pool.query(
      `select name, scopes, expires_at, metadata from developer_api_keys where id = $1 and workspace_id = $2 and status = 'active'`,
      [keyId, workspaceId]
    );
    if (!current.rows[0]) throw Object.assign(new Error("Active API key not found."), { statusCode: 404 });
    await this.revokeKey({ workspaceId, userId, keyId });
    const created = await this.createKey({
      workspaceId,
      userId,
      name: `${current.rows[0].name} (rotated)`,
      scopes: current.rows[0].scopes,
      expiresAt: current.rows[0].expires_at,
      metadata: { ...current.rows[0].metadata, rotatedFromKeyId: keyId },
    });
    await this.pool.query("update developer_api_keys set rotated_from_key_id = $1 where id = $2", [keyId, created.key.id]);
    return created;
  }

  async authenticateSecret(secretKey, { requiredScopes = [] } = {}) {
    this.#assertPool();
    if (!secretKey?.startsWith("sk_codrai_")) {
      throw Object.assign(new Error("A valid CODRAI secret key is required."), { statusCode: 401, code: "invalid_api_key" });
    }
    const secretHash = sha256(secretKey);
    const result = await this.pool.query(
      `select * from developer_api_keys
       where secret_key_hash = $1 and status = 'active' and revoked_at is null and (expires_at is null or expires_at > now())
       limit 1`,
      [secretHash]
    );
    const row = result.rows[0];
    if (!row) throw Object.assign(new Error("Invalid, expired, or revoked CODRAI API key."), { statusCode: 401, code: "invalid_api_key" });
    const scopes = row.scopes || [];
    const missing = requiredScopes.filter((scope) => !scopes.includes(scope));
    if (missing.length) {
      throw Object.assign(new Error(`API key is missing required scopes: ${missing.join(", ")}`), { statusCode: 403, code: "insufficient_scope" });
    }
    await this.pool.query("update developer_api_keys set last_used_at = now(), usage_count = usage_count + 1 where id = $1", [row.id]);
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      userId: row.user_id,
      name: row.name,
      scopes,
      publicKey: row.public_key,
      secretKey,
    };
  }

  verifySignature({ secretKey, signature, timestamp, body }) {
    if (!signature && !timestamp) return { required: false, ok: true };
    if (!signature || !timestamp) {
      throw Object.assign(new Error("Both x-codrai-signature and x-codrai-timestamp are required for signed requests."), { statusCode: 401, code: "invalid_signature" });
    }
    const ageMs = Math.abs(Date.now() - Number(timestamp));
    if (!Number.isFinite(ageMs) || ageMs > 5 * 60 * 1000) {
      throw Object.assign(new Error("Request signature timestamp is outside the replay protection window."), { statusCode: 401, code: "stale_signature" });
    }
    const expected = createHmac("sha256", secretKey).update(`${timestamp}.${body || ""}`).digest("hex");
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      throw Object.assign(new Error("Request signature validation failed."), { statusCode: 401, code: "invalid_signature" });
    }
    return { required: true, ok: true };
  }

  async recordUsage(event) {
    this.#assertPool();
    await this.pool.query(
      `insert into developer_api_usage_events
        (id, workspace_id, user_id, api_key_id, route, method, model, provider, status, request_tokens, response_tokens, total_tokens, latency_ms, cost_estimate, correlation_id, ip_address, user_agent, error_code, error_message, metadata, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, now())`,
      [
        randomUUID(),
        event.workspaceId,
        event.userId || null,
        event.apiKeyId || null,
        event.route,
        event.method,
        event.model || null,
        event.provider || null,
        event.status,
        event.requestTokens || 0,
        event.responseTokens || 0,
        event.totalTokens || 0,
        event.latencyMs || 0,
        event.costEstimate || 0,
        event.correlationId || null,
        event.ipAddress || null,
        event.userAgent || null,
        event.errorCode || null,
        event.errorMessage || null,
        event.metadata || {},
      ]
    );
  }

  async usageSummary({ workspaceId, limit = 100 }) {
    this.#assertPool();
    const [summary, recent, byProvider, byDay, quota] = await Promise.all([
      this.pool.query(
        `select count(*)::int as requests,
                coalesce(sum(total_tokens), 0)::bigint as tokens,
                coalesce(sum(cost_estimate), 0)::numeric as cost,
                coalesce(avg(latency_ms), 0)::numeric as avg_latency_ms,
                count(*) filter (where status <> 'success')::int as errors
         from developer_api_usage_events
         where workspace_id = $1 and created_at >= date_trunc('month', now())`,
        [workspaceId]
      ),
      this.pool.query(
        `select id, route, method, model, provider, status, total_tokens, latency_ms, correlation_id, error_code, error_message, created_at
         from developer_api_usage_events
         where workspace_id = $1
         order by created_at desc
         limit $2`,
        [workspaceId, Math.min(Number(limit) || 100, 250)]
      ),
      this.pool.query(
        `select coalesce(provider, 'unrouted') as provider, count(*)::int as requests, coalesce(sum(total_tokens), 0)::bigint as tokens
         from developer_api_usage_events
         where workspace_id = $1 and created_at >= date_trunc('month', now())
         group by provider
         order by requests desc`,
        [workspaceId]
      ),
      this.pool.query(
        `select date_trunc('day', created_at) as day, count(*)::int as requests, coalesce(sum(total_tokens), 0)::bigint as tokens
         from developer_api_usage_events
         where workspace_id = $1 and created_at >= now() - interval '30 days'
         group by 1
         order by 1 asc`,
        [workspaceId]
      ),
      this.pool.query(
        `insert into developer_api_quota_state (workspace_id, updated_at)
         values ($1, now())
         on conflict (workspace_id) do update set updated_at = developer_api_quota_state.updated_at
         returning *`,
        [workspaceId]
      ),
    ]);
    return {
      summary: summary.rows[0],
      recent: recent.rows,
      byProvider: byProvider.rows,
      byDay: byDay.rows,
      quota: quota.rows[0],
    };
  }

  async checkQuota({ workspaceId }) {
    this.#assertPool();
    const usage = await this.usageSummary({ workspaceId, limit: 1 });
    const quota = usage.quota || {};
    const requests = Number(usage.summary?.requests || 0);
    const tokens = Number(usage.summary?.tokens || 0);
    const requestLimit = Number(quota.monthly_request_limit || 0);
    const tokenLimit = Number(quota.monthly_token_limit || 0);
    const exceeded = (requestLimit > 0 && requests >= requestLimit) || (tokenLimit > 0 && tokens >= tokenLimit);
    return {
      ok: !(quota.hard_limit_enabled && exceeded),
      exceeded,
      hardLimitEnabled: Boolean(quota.hard_limit_enabled),
      requests,
      tokens,
      requestLimit,
      tokenLimit,
      remainingRequests: requestLimit > 0 ? Math.max(0, requestLimit - requests) : null,
      remainingTokens: tokenLimit > 0 ? Math.max(0, tokenLimit - tokens) : null,
    };
  }

  estimateTokens(text) {
    return Math.ceil(String(text || "").length / 4);
  }

  #assertPool() {
    if (!this.pool) throw new Error("Developer platform requires PostgreSQL DATABASE_URL.");
  }

  async #audit({ workspaceId, userId, action, targetId, metadata = {} }) {
    if (!this.pool) return;
    await this.pool.query(
      `insert into audit_logs (id, workspace_id, user_id, action, target_type, target_id, metadata, created_at)
       values ($1, $2, $3, $4, 'developer_api_key', $5, $6, now())`,
      [randomUUID(), workspaceId, userId || null, action, targetId, metadata]
    );
  }
}
