import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";

const GOOGLE_DISCOVERY_URL = "https://accounts.google.com/.well-known/openid-configuration";

function keyFromSecret() {
  const secret = process.env.PROVIDER_ENCRYPTION_KEY || process.env.JWT_SECRET || "codrai-local-provider-secret";
  return createHash("sha256").update(secret).digest();
}

function mask(value) {
  if (!value) return null;
  return value.length <= 8 ? "****" : `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export class GoogleOAuthConfigService {
  constructor({ pool }) {
    this.pool = pool;
  }

  async publicConfig() {
    const config = await this.resolve();
    return {
      configured: Boolean(config.clientId && config.clientSecret && config.status !== "error"),
      clientId: config.clientId || null,
      authorizedOrigin: config.authorizedOrigin || this.#defaultOrigin(),
      authorizedRedirect: config.authorizedRedirect || this.#defaultRedirect(),
      redirectUri: config.redirectUri || "postmessage",
      status: config.status || (config.clientId && config.clientSecret ? "configured" : "missing"),
    };
  }

  async adminStatus() {
    const config = await this.resolve({ includeSecret: false });
    return {
      configured: Boolean(config.clientId && config.clientSecretConfigured),
      clientId: config.clientId || "",
      clientIdMasked: mask(config.clientId),
      clientSecretConfigured: Boolean(config.clientSecretConfigured),
      redirectUri: config.redirectUri || "postmessage",
      authorizedOrigin: config.authorizedOrigin || this.#defaultOrigin(),
      authorizedRedirect: config.authorizedRedirect || this.#defaultRedirect(),
      status: config.status || "missing",
      lastCheckedAt: config.lastCheckedAt || null,
      lastError: config.lastError || null,
      source: config.source,
    };
  }

  async save({ userId, workspaceId, clientId, clientSecret, redirectUri, authorizedOrigin, authorizedRedirect }) {
    this.#assertPool();
    const normalized = this.#validate({ clientId, clientSecret, redirectUri, authorizedOrigin, authorizedRedirect, allowMissingSecret: true });
    const existing = await this.#row();
    const encryptedSecret = normalized.clientSecret
      ? this.#encrypt(normalized.clientSecret)
      : existing?.encrypted_client_secret_ref;
    if (!encryptedSecret) {
      throw Object.assign(new Error("Google Client Secret is required for first-time setup."), { statusCode: 400 });
    }

    await this.pool.query(
      `insert into oauth_provider_configs
        (id, workspace_id, provider, client_id, encrypted_client_secret_ref, scopes, status,
         redirect_uri, authorized_origin, authorized_redirect, metadata, created_at, updated_at)
       values ($1, null, 'google', $2, $3, $4, 'configured', $5, $6, $7, $8, now(), now())
       on conflict (provider) where workspace_id is null
       do update set client_id = excluded.client_id,
                     encrypted_client_secret_ref = excluded.encrypted_client_secret_ref,
                     scopes = excluded.scopes,
                     status = 'configured',
                     redirect_uri = excluded.redirect_uri,
                     authorized_origin = excluded.authorized_origin,
                     authorized_redirect = excluded.authorized_redirect,
                     metadata = excluded.metadata,
                     last_error = null,
                     updated_at = now()`,
      [
        randomUUID(),
        normalized.clientId,
        encryptedSecret,
        ["openid", "email", "profile"],
        normalized.redirectUri,
        normalized.authorizedOrigin,
        normalized.authorizedRedirect,
        { configuredBy: userId || null, workspaceId: workspaceId || null },
      ]
    );
    await this.#audit({ workspaceId, userId, action: "oauth.google.config.saved", metadata: { clientId: mask(normalized.clientId), authorizedOrigin: normalized.authorizedOrigin } });
    return this.adminStatus();
  }

  async test() {
    const config = await this.resolve({ includeSecret: true });
    const checks = [];

    checks.push({ name: "client_id", status: config.clientId ? "pass" : "fail", detail: config.clientId ? "Client ID is configured." : "Google Client ID is missing." });
    checks.push({ name: "client_secret", status: config.clientSecret ? "pass" : "fail", detail: config.clientSecret ? "Client Secret is configured and encrypted at rest." : "Google Client Secret is missing." });
    checks.push({ name: "authorized_origin", status: config.authorizedOrigin ? "pass" : "fail", detail: config.authorizedOrigin || "Authorized origin is missing." });
    checks.push({ name: "authorized_redirect", status: config.authorizedRedirect ? "pass" : "fail", detail: config.authorizedRedirect || "Authorized redirect URL is missing." });

    let discovery;
    try {
      const response = await fetch(GOOGLE_DISCOVERY_URL, { signal: AbortSignal.timeout?.(8000) });
      discovery = await response.json();
      checks.push({
        name: "google_discovery",
        status: response.ok && discovery.authorization_endpoint && discovery.token_endpoint ? "pass" : "fail",
        detail: response.ok ? "Google OpenID discovery is reachable." : `Google discovery returned HTTP ${response.status}.`,
      });
    } catch (error) {
      checks.push({ name: "google_discovery", status: "fail", detail: error.message || "Google discovery request failed." });
    }

    if (config.clientId && config.clientSecret && discovery?.token_endpoint) {
      try {
        const body = new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code: "codrai-oauth-validation-probe",
          grant_type: "authorization_code",
          redirect_uri: config.redirectUri || "postmessage",
        });
        const response = await fetch(discovery.token_endpoint, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body,
          signal: AbortSignal.timeout?.(8000),
        });
        const payload = await response.json().catch(() => ({}));
        const validProbe = response.ok || payload.error === "invalid_grant";
        checks.push({
          name: "oauth_client_probe",
          status: validProbe ? "pass" : "fail",
          detail: validProbe
            ? "Google token endpoint reached; OAuth client credentials were not rejected. The validation code is intentionally invalid."
            : `Google rejected the OAuth client configuration: ${payload.error_description || payload.error || `HTTP ${response.status}`}.`,
        });
      } catch (error) {
        checks.push({ name: "oauth_client_probe", status: "fail", detail: error.message || "Google OAuth client probe failed." });
      }
    } else {
      checks.push({
        name: "oauth_client_probe",
        status: "fail",
        detail: "OAuth client probe requires client ID, client secret, and Google token endpoint discovery.",
      });
    }

    const status = checks.every((check) => check.status === "pass") ? "pass" : "fail";
    if (this.pool) {
      await this.pool.query(
        `update oauth_provider_configs
         set status = $1, last_checked_at = now(), last_error = $2, updated_at = now()
         where workspace_id is null and provider = 'google'`,
        [status === "pass" ? "active" : "error", status === "pass" ? null : checks.filter((check) => check.status !== "pass").map((check) => check.detail).join("; ")]
      ).catch(() => null);
    }
    return { status, generatedAt: new Date().toISOString(), checks };
  }

  async resolve({ includeSecret = true } = {}) {
    const row = await this.#row();
    const envClientId = process.env.GOOGLE_CLIENT_ID || "";
    const envClientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
    const clientId = row?.client_id || envClientId;
    const clientSecret = row?.encrypted_client_secret_ref && includeSecret
      ? this.#decrypt(row.encrypted_client_secret_ref)
      : envClientSecret;

    return {
      clientId,
      clientSecret: includeSecret ? clientSecret : undefined,
      clientSecretConfigured: Boolean(row?.encrypted_client_secret_ref || envClientSecret),
      redirectUri: process.env.GOOGLE_REDIRECT_URI || row?.redirect_uri || "postmessage",
      authorizedOrigin: process.env.GOOGLE_AUTHORIZED_ORIGIN || row?.authorized_origin || this.#defaultOrigin(),
      authorizedRedirect: process.env.GOOGLE_AUTHORIZED_REDIRECT || row?.authorized_redirect || this.#defaultRedirect(),
      status: row?.status || (clientId && (row?.encrypted_client_secret_ref || envClientSecret) ? "configured" : "missing"),
      lastCheckedAt: row?.last_checked_at || null,
      lastError: row?.last_error || null,
      source: row ? "database" : (envClientId ? "environment" : "missing"),
    };
  }

  async #row() {
    if (!this.pool) return null;
    const result = await this.pool.query(
      `select *
       from oauth_provider_configs
       where provider = 'google' and workspace_id is null
       order by updated_at desc nulls last, created_at desc
       limit 1`
    ).catch(() => ({ rows: [] }));
    return result.rows[0] || null;
  }

  #validate({ clientId, clientSecret, redirectUri, authorizedOrigin, authorizedRedirect, allowMissingSecret = false }) {
    const normalized = {
      clientId: String(clientId || "").trim(),
      clientSecret: String(clientSecret || "").trim(),
      redirectUri: String(redirectUri || "postmessage").trim(),
      authorizedOrigin: String(authorizedOrigin || this.#defaultOrigin()).trim(),
      authorizedRedirect: String(authorizedRedirect || this.#defaultRedirect()).trim(),
    };
    if (!/^[\w.-]+\.apps\.googleusercontent\.com$/.test(normalized.clientId)) {
      throw Object.assign(new Error("Google Client ID must end with .apps.googleusercontent.com."), { statusCode: 400 });
    }
    if (!allowMissingSecret && normalized.clientSecret.length < 12) {
      throw Object.assign(new Error("Google Client Secret is too short."), { statusCode: 400 });
    }
    if (normalized.clientSecret && normalized.clientSecret.length < 12) {
      throw Object.assign(new Error("Google Client Secret is too short."), { statusCode: 400 });
    }
    for (const [label, value] of [["Authorized Origin", normalized.authorizedOrigin], ["Authorized Redirect", normalized.authorizedRedirect]]) {
      try {
        const url = new URL(value);
        if (!["http:", "https:"].includes(url.protocol)) throw new Error("invalid protocol");
      } catch {
        throw Object.assign(new Error(`${label} must be a valid http or https URL.`), { statusCode: 400 });
      }
    }
    return normalized;
  }

  async #audit({ workspaceId, userId, action, metadata = {} }) {
    if (!this.pool) return null;
    await this.pool.query(
      `insert into audit_logs (id, workspace_id, user_id, action, target_type, target_id, metadata, created_at)
       values ($1, $2, $3, $4, 'oauth_provider', 'google', $5, now())`,
      [randomUUID(), workspaceId || null, userId || null, action, metadata]
    ).catch(() => null);
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

  #defaultOrigin() {
    return process.env.GOOGLE_AUTHORIZED_ORIGIN || process.env.CLIENT_URL || process.env.PUBLIC_APP_URL || "http://localhost:5173";
  }

  #defaultRedirect() {
    return process.env.GOOGLE_AUTHORIZED_REDIRECT || process.env.GOOGLE_CALLBACK_URL || `${this.#defaultOrigin().replace(/\/$/, "")}/auth/google/callback`;
  }

  #assertPool() {
    if (!this.pool) throw Object.assign(new Error("Google OAuth settings require PostgreSQL DATABASE_URL."), { statusCode: 503 });
  }
}
