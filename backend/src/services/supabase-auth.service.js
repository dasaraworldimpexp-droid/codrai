import { env } from "../config/env.js";

function authError(message, statusCode = 502, code = "SUPABASE_AUTH_ERROR") {
  return Object.assign(new Error(message), { statusCode, code });
}

export class SupabaseAuthService {
  constructor() {
    this.baseUrl = String(env.supabaseUrl || "").trim().replace(/\/+$/, "");
    this.serviceRoleKey = String(env.supabaseServiceRoleKey || "").trim();
    this.publicKey = String(env.supabaseAnonKey || this.serviceRoleKey || "").trim();
  }

  get configured() {
    return Boolean(this.baseUrl && this.serviceRoleKey);
  }

  async createPasswordUser({ email, password, name, phone = null, emailConfirm = false, phoneConfirm = false }) {
    if (!this.configured) return { status: "disabled", user: null, created: false };
    const response = await this.#request("/auth/v1/admin/users", {
      method: "POST",
      admin: true,
      allowConflict: true,
      body: {
        email,
        ...(phone ? { phone } : {}),
        password,
        email_confirm: emailConfirm,
        ...(phone ? { phone_confirm: phoneConfirm } : {}),
        user_metadata: { full_name: name || null, name: name || null, phone: phone || null, source: "codrai" },
        app_metadata: { provider: "email", providers: ["email"] },
      },
    });
    if (!response.conflict) return { status: "created", user: response.data, created: true };

    const signedIn = await this.signInWithPassword({ email, password });
    return { status: "existing", user: signedIn.user, created: false };
  }

  async createExternalUser({ email, name, avatarUrl, provider = "google", phone = null }) {
    if (!this.configured) return { status: "disabled", user: null, created: false };
    const response = await this.#request("/auth/v1/admin/users", {
      method: "POST",
      admin: true,
      allowConflict: true,
      body: {
        email,
        ...(phone ? { phone, phone_confirm: true } : {}),
        email_confirm: true,
        user_metadata: {
          full_name: name || null,
          name: name || null,
          avatar_url: avatarUrl || null,
          phone: phone || null,
          source: "codrai",
        },
        app_metadata: { provider, providers: [provider] },
      },
    });
    return response.conflict
      ? { status: "existing", user: null, created: false }
      : { status: "created", user: response.data, created: true };
  }

  async updateUser({ userId, email, password, phone, name, avatarUrl, emailConfirm, phoneConfirm }) {
    if (!this.configured || !userId) return { status: "disabled", user: null };
    const userMetadata = {};
    if (name !== undefined) {
      userMetadata.full_name = name || null;
      userMetadata.name = name || null;
    }
    if (avatarUrl !== undefined) userMetadata.avatar_url = avatarUrl || null;
    if (phone !== undefined) userMetadata.phone = phone || null;
    const body = {
      ...(email !== undefined ? { email } : {}),
      ...(password !== undefined ? { password } : {}),
      ...(phone !== undefined && phone ? { phone } : {}),
      ...(emailConfirm !== undefined ? { email_confirm: emailConfirm } : {}),
      ...(phoneConfirm !== undefined && phone ? { phone_confirm: phoneConfirm } : {}),
      ...(Object.keys(userMetadata).length ? { user_metadata: userMetadata } : {}),
    };
    const response = await this.#request(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: "PUT",
      admin: true,
      body,
    });
    return { status: "updated", user: response.data };
  }

  async signInWithPassword({ email, password }) {
    if (!this.configured) return { status: "disabled", user: null, session: null };
    const response = await this.#request("/auth/v1/token?grant_type=password", {
      method: "POST",
      key: this.publicKey,
      invalidCredentialsStatus: 401,
      body: { email, password },
    });
    return { status: "authenticated", user: response.data.user || null, session: response.data };
  }

  async confirmEmail(userId) {
    if (!this.configured || !userId) return { status: "disabled" };
    await this.updateUser({ userId, emailConfirm: true });
    return { status: "confirmed" };
  }

  async updatePassword(userId, password) {
    if (!this.configured || !userId) return { status: "disabled" };
    await this.updateUser({ userId, password });
    return { status: "updated" };
  }

  async deleteUser(userId) {
    if (!this.configured || !userId) return { status: "disabled" };
    await this.#request(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: "DELETE",
      admin: true,
    });
    return { status: "deleted" };
  }

  async #request(path, { method, body, key, allowConflict = false, invalidCredentialsStatus }) {
    const apiKey = key || this.serviceRoleKey;
    let response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(Number(process.env.SUPABASE_AUTH_TIMEOUT_MS || 10_000)),
      });
    } catch (error) {
      throw authError(`Supabase Auth is unreachable: ${error.message}`, 503, "SUPABASE_AUTH_UNREACHABLE");
    }

    const text = await response.text();
    let data = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text };
    }
    if (response.ok) return { data };

    const code = String(data.code || data.error_code || data.error || "");
    const message = String(data.message || data.msg || data.error_description || "Supabase Auth request failed.");
    const conflict = response.status === 422 && /already|registered|exists|unique/i.test(`${code} ${message}`);
    if (allowConflict && conflict) return { conflict: true, data };
    if (invalidCredentialsStatus && response.status === 400) {
      throw authError("Invalid email or password.", invalidCredentialsStatus, "INVALID_CREDENTIALS");
    }
    throw authError(message, response.status >= 500 ? 502 : response.status, code || "SUPABASE_AUTH_ERROR");
  }
}
