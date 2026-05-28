import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { env } from "../config/env.js";

export class AuthService {
  constructor({ pool }) {
    this.pool = pool;
  }

  async signup({ email, password, name, rememberMe = false }) {
    this.#assertConfigured();
    if (!email || !password) throw new Error("Email and password are required.");
    if (password.length < 8) throw new Error("Password must be at least 8 characters.");

    const userId = randomUUID();
    const workspaceId = randomUUID();
    const passwordHash = await bcrypt.hash(password, 12);
    const normalizedEmail = email.toLowerCase().trim();
    const existingUsers = await this.pool.query("select count(*)::int as count from users");
    const role = existingUsers.rows[0]?.count === 0 ? "admin" : "user";
    const emailVerificationToken = randomBytes(32).toString("hex");
    const emailVerificationHash = createHash("sha256").update(emailVerificationToken).digest("hex");

    await this.pool.query("begin");
    try {
      await this.pool.query(
        `insert into users (id, email, password_hash, name, role, email_verified_at, created_at)
         values ($1, $2, $3, $4, $5, null, now())`,
        [userId, normalizedEmail, passwordHash, name || null, role]
      );
      await this.pool.query(
        `insert into workspaces (id, name, owner_id, created_at)
         values ($1, $2, $3, now())`,
        [workspaceId, `${name || normalizedEmail}'s workspace`, userId]
      );
      await this.pool.query(
        `insert into workspace_members (workspace_id, user_id, role, created_at)
         values ($1, $2, 'owner', now())`,
        [workspaceId, userId]
      );
      await this.pool.query(
        `insert into email_verification_tokens (id, user_id, token_hash, expires_at, created_at)
         values ($1, $2, $3, now() + interval '24 hours', now())`,
        [randomUUID(), userId, emailVerificationHash]
      );
      await this.pool.query("commit");
    } catch (error) {
      await this.pool.query("rollback");
      throw error;
    }

    const session = await this.#createSession({
      userId,
      email: normalizedEmail,
      workspaceId,
      rememberMe,
      user: { id: userId, email: normalizedEmail, name: name || null, role, emailVerified: false },
    });

    if (env.nodeEnv !== "production") {
      session.emailVerification = {
        message: "Email verification email transport is not configured. Use this token in development.",
        token: emailVerificationToken,
      };
    }

    return session;
  }

  async login({ email, password, rememberMe = false, userAgent, ipAddress }) {
    this.#assertConfigured();
    const result = await this.pool.query(
      "select id, email, password_hash, name, role, email_verified_at from users where email = $1",
      [email.toLowerCase().trim()]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw new Error("Invalid email or password.");
    }

    const workspace = await this.pool.query(
      `select workspace_id from workspace_members where user_id = $1 order by created_at asc limit 1`,
      [user.id]
    );

    return this.#createSession({
      userId: user.id,
      email: user.email,
      workspaceId: workspace.rows[0]?.workspace_id,
      rememberMe,
      userAgent,
      ipAddress,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || "user",
        emailVerified: Boolean(user.email_verified_at),
      },
    });
  }

  async me(userId) {
    this.#assertConfigured();
    const result = await this.pool.query(
      `select u.id, u.email, u.name, u.role, u.email_verified_at, wm.workspace_id, wm.role as workspace_role
       from users u
       left join workspace_members wm on wm.user_id = u.id
       where u.id = $1`,
      [userId]
    );
    const user = result.rows[0];
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || "user",
      emailVerified: Boolean(user.email_verified_at),
      workspaceId: user.workspace_id,
      workspaceRole: user.workspace_role,
    };
  }

  async refresh({ refreshToken, userAgent, ipAddress }) {
    this.#assertConfigured();
    if (!refreshToken) throw new Error("Refresh token is required.");
    const refreshHash = createHash("sha256").update(refreshToken).digest("hex");
    const current = await this.pool.query(
      `select id, user_id, expires_at, revoked_at
       from refresh_tokens
       where token_hash = $1`,
      [refreshHash]
    );
    const tokenRecord = current.rows[0];
    if (!tokenRecord || tokenRecord.revoked_at || new Date(tokenRecord.expires_at) <= new Date()) {
      throw new Error("Refresh token is expired or revoked.");
    }
    await this.pool.query("update refresh_tokens set revoked_at = now() where id = $1", [tokenRecord.id]);
    const user = await this.me(tokenRecord.user_id);
    if (!user) throw new Error("User no longer exists.");
    return this.#createSession({
      userId: user.id,
      email: user.email,
      workspaceId: user.workspaceId,
      rememberMe: new Date(tokenRecord.expires_at).getTime() - Date.now() > 8 * 24 * 60 * 60 * 1000,
      userAgent,
      ipAddress,
      user,
    });
  }

  async logout({ sessionId, userId, refreshToken }) {
    this.#assertConfigured();
    if (sessionId && userId) {
      await this.pool.query("update user_sessions set revoked_at = now() where id = $1 and user_id = $2", [sessionId, userId]);
    }
    if (refreshToken) {
      const refreshHash = createHash("sha256").update(refreshToken).digest("hex");
      await this.pool.query("update refresh_tokens set revoked_at = now() where token_hash = $1", [refreshHash]);
    }
    return { status: "ok" };
  }

  async forgotPassword({ email }) {
    this.#assertConfigured();
    if (!email) throw new Error("Email is required.");
    const user = await this.pool.query("select id, email from users where email = $1", [email.toLowerCase().trim()]);
    if (!user.rows[0]) return { status: "ok" };
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await this.pool.query(
      `insert into password_reset_tokens (id, user_id, token_hash, expires_at, created_at)
       values ($1, $2, $3, now() + interval '1 hour', now())`,
      [randomUUID(), user.rows[0].id, tokenHash]
    );
    return env.nodeEnv === "production"
      ? { status: "ok" }
      : { status: "ok", resetToken: token, message: "Password email transport is not configured. Development token returned." };
  }

  async resetPassword({ token, password }) {
    this.#assertConfigured();
    if (!token || !password) throw new Error("Reset token and password are required.");
    if (password.length < 8) throw new Error("Password must be at least 8 characters.");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const result = await this.pool.query(
      `select id, user_id from password_reset_tokens
       where token_hash = $1 and used_at is null and expires_at > now()
       order by created_at desc limit 1`,
      [tokenHash]
    );
    const reset = result.rows[0];
    if (!reset) throw new Error("Reset token is invalid or expired.");
    const passwordHash = await bcrypt.hash(password, 12);
    await this.pool.query("begin");
    try {
      await this.pool.query("update users set password_hash = $1, updated_at = now() where id = $2", [passwordHash, reset.user_id]);
      await this.pool.query("update password_reset_tokens set used_at = now() where id = $1", [reset.id]);
      await this.pool.query("update user_sessions set revoked_at = now() where user_id = $1 and revoked_at is null", [reset.user_id]);
      await this.pool.query("commit");
    } catch (error) {
      await this.pool.query("rollback");
      throw error;
    }
    return { status: "ok" };
  }

  async verifyEmail({ token }) {
    this.#assertConfigured();
    const tokenHash = createHash("sha256").update(token || "").digest("hex");
    const result = await this.pool.query(
      `select id, user_id from email_verification_tokens
       where token_hash = $1 and used_at is null and expires_at > now()
       order by created_at desc limit 1`,
      [tokenHash]
    );
    const verification = result.rows[0];
    if (!verification) throw new Error("Verification token is invalid or expired.");
    await this.pool.query("begin");
    try {
      await this.pool.query("update users set email_verified_at = now(), updated_at = now() where id = $1", [verification.user_id]);
      await this.pool.query("update email_verification_tokens set used_at = now() where id = $1", [verification.id]);
      await this.pool.query("commit");
    } catch (error) {
      await this.pool.query("rollback");
      throw error;
    }
    return { status: "ok" };
  }

  async #createSession({ userId, email, workspaceId, rememberMe, userAgent, ipAddress, user }) {
    const tokenId = randomUUID();
    const expiresIn = rememberMe ? "30d" : (process.env.JWT_EXPIRES_IN || "7d");
    const token = jwt.sign({ sub: userId, email, workspaceId, sid: tokenId, role: user?.role || "user" }, env.jwtSecret || process.env.JWT_SECRET || "dev-secret", { expiresIn });
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000);
    const refreshToken = randomBytes(48).toString("hex");
    const refreshTokenHash = createHash("sha256").update(refreshToken).digest("hex");
    const refreshExpiresAt = new Date(Date.now() + (rememberMe ? 45 : 14) * 24 * 60 * 60 * 1000);

    await this.pool.query(
      `insert into user_sessions (id, user_id, token_hash, user_agent, ip_address, expires_at, created_at)
       values ($1, $2, $3, $4, $5, $6, now())`,
      [tokenId, userId, tokenHash, userAgent || null, ipAddress || null, expiresAt]
    );
    await this.pool.query(
      `insert into refresh_tokens (id, user_id, token_hash, expires_at, created_at)
       values ($1, $2, $3, $4, now())`,
      [randomUUID(), userId, refreshTokenHash, refreshExpiresAt]
    );

    return {
      token,
      refreshToken,
      user: user || { id: userId, email, role: "user" },
      workspaceId,
      expiresAt: expiresAt.toISOString(),
      refreshExpiresAt: refreshExpiresAt.toISOString(),
    };
  }

  #assertConfigured() {
    if (!this.pool) throw new Error("Authentication requires PostgreSQL DATABASE_URL.");
  }
}
