import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes, randomInt, randomUUID, createHash, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";
import { GoogleOAuthConfigService } from "./google-oauth-config.service.js";
import { sendEmail } from "./email.service.js";
import { normalizeGlobalMobile, normalizeLanguage, normalizeTimezone } from "./global-identity.service.js";
import { OtpDeliveryService } from "./otp-delivery.service.js";
import { SupabaseAuthService } from "./supabase-auth.service.js";
import { TwilioVerifyService } from "./twilio-verify.service.js";

function maskEmail(email) {
  const [name, domain] = String(email || "").split("@");
  if (!domain) return null;
  return `${name.slice(0, 2)}***@${domain}`;
}

function maskMobile(mobile) {
  const value = String(mobile || "");
  if (value.length < 6) return null;
  return `${value.slice(0, 3)}******${value.slice(-3)}`;
}

function shouldDebugAuthLogin() {
  return String(process.env.DEBUG_AUTH_LOGIN || "").toLowerCase() === "true";
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function requireValidEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw Object.assign(new Error("Enter a valid email address."), {
      code: "INVALID_EMAIL",
      statusCode: 400,
    });
  }
  return normalizedEmail;
}

function normalizeE164Phone(phone) {
  const normalized = String(phone || "").trim().replace(/[^\d+]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw Object.assign(new Error("Enter a valid mobile number in E.164 format, for example +919190197990."), {
      code: "INVALID_PHONE_NUMBER",
      statusCode: 400,
    });
  }
  return normalized;
}

function phoneAliasEmail(phone) {
  return `phone.${phone.replace(/\D/g, "")}@phone.codrai.local`;
}

function otpHash({ challengeId, email, code }) {
  return createHash("sha256")
    .update(`${env.otpSecret || "codrai-development-otp"}:${challengeId}:${email}:${code}`)
    .digest("hex");
}

function otpMatches(expected, supplied) {
  const expectedBuffer = Buffer.from(String(expected || ""), "hex");
  const suppliedBuffer = Buffer.from(String(supplied || ""), "hex");
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
}

export class AuthService {
  constructor({ pool, redis = null }) {
    this.pool = pool;
    this.redis = redis;
    this.supabaseAuth = new SupabaseAuthService();
    this.twilioVerify = new TwilioVerifyService();
  }

  async sendTwilioOtp({ phone, userAgent, ipAddress }) {
    this.#assertConfigured();
    const normalizedPhone = normalizeE164Phone(phone);
    const cooldown = await this.#safeTelemetryQuery({
      label: "CODRAI Twilio OTP cooldown check failed",
      fallback: { rows: [] },
      queryable: this.pool,
      sql: `select created_at
       from public.otp_logs
       where phone_number = $1
         and status = 'sent'
       order by created_at desc
       limit 1`,
      params: [normalizedPhone],
    });
    if (cooldown.rows[0]) {
      const waitMs = 60_000 - (Date.now() - new Date(cooldown.rows[0].created_at).getTime());
      if (waitMs > 0) {
        throw Object.assign(new Error(`Resend available in ${Math.ceil(waitMs / 1000)} seconds.`), {
          statusCode: 429,
          retryAfter: Math.ceil(waitMs / 1000),
        });
      }
    }

    try {
      const result = await this.twilioVerify.sendOtp({ phone: normalizedPhone });
      await this.#safeTelemetryQuery({
        label: "CODRAI Twilio OTP sent log failed",
        queryable: this.pool,
        sql:
        `insert into public.otp_logs
           (id, phone_number, status, provider, ip_address, user_agent, twilio_sid, metadata, created_at)
         values ($1, $2, 'sent', 'twilio_verify', $3, $4, $5, $6::jsonb, now())`,
        params: [
          randomUUID(),
          normalizedPhone,
          ipAddress || null,
          userAgent || null,
          result.sid,
          JSON.stringify({ channel: result.channel, twilioStatus: result.status }),
        ],
      });
      await this.#audit({
        action: "auth.twilio_otp.sent",
        targetId: normalizedPhone,
        metadata: { phone: maskMobile(normalizedPhone), provider: "twilio_verify" },
      });
      return {
        success: true,
        message: "OTP sent successfully",
        phone: maskMobile(normalizedPhone),
        resendAfterSeconds: 60,
      };
    } catch (error) {
      await this.#safeTelemetryQuery({
        label: "CODRAI Twilio OTP failure log failed",
        queryable: this.pool,
        sql:
        `insert into public.otp_logs
           (id, phone_number, status, provider, ip_address, user_agent, error_message, metadata, created_at)
         values ($1, $2, 'failed', 'twilio_verify', $3, $4, $5, $6::jsonb, now())`,
        params: [
          randomUUID(),
          normalizedPhone,
          ipAddress || null,
          userAgent || null,
          String(error.message || "Twilio Verify send failed.").slice(0, 500),
          JSON.stringify({ code: error.code || "TWILIO_VERIFY_SEND_FAILED", twilioStatus: error.twilioStatus || null }),
        ],
      });
      throw error;
    }
  }

  async verifyTwilioOtp({ phone, otp, rememberMe = true, userAgent, ipAddress, deviceFingerprint = null, deviceName = null }) {
    this.#assertConfigured();
    const normalizedPhone = normalizeE164Phone(phone);
    const code = String(otp || "").trim();
    if (!/^\d{4,10}$/.test(code)) {
      throw Object.assign(new Error("Enter the verification code sent to your phone."), { statusCode: 400 });
    }

    const recentFailures = await this.#safeTelemetryQuery({
      label: "CODRAI Twilio OTP recent failure check failed",
      fallback: { rows: [{ attempts: 0 }] },
      queryable: this.pool,
      sql: `select count(*)::int as attempts
       from public.otp_logs
       where phone_number = $1
         and status = 'failed'
         and created_at > now() - interval '15 minutes'`,
      params: [normalizedPhone],
    });
    if (Number(recentFailures.rows[0]?.attempts || 0) >= 5) {
      throw Object.assign(new Error("Too many failed OTP attempts. Please wait before trying again."), { statusCode: 429 });
    }

    let verifyResult;
    try {
      verifyResult = await this.twilioVerify.verifyOtp({ phone: normalizedPhone, otp: code });
    } catch (error) {
      await this.#safeTelemetryQuery({
        label: "CODRAI Twilio OTP verify failure log failed",
        queryable: this.pool,
        sql:
        `insert into public.otp_logs
           (id, phone_number, status, provider, ip_address, user_agent, error_message, metadata, created_at)
         values ($1, $2, 'failed', 'twilio_verify', $3, $4, $5, $6::jsonb, now())`,
        params: [
          randomUUID(),
          normalizedPhone,
          ipAddress || null,
          userAgent || null,
          String(error.message || "Twilio Verify check failed.").slice(0, 500),
          JSON.stringify({ code: error.code || "TWILIO_VERIFY_CHECK_FAILED", twilioStatus: error.twilioStatus || null }),
        ],
      });
      throw error;
    }

    if (!verifyResult.approved) {
      await this.#safeTelemetryQuery({
        label: "CODRAI Twilio invalid OTP log failed",
        queryable: this.pool,
        sql:
        `insert into public.otp_logs
           (id, phone_number, status, provider, ip_address, user_agent, twilio_sid, error_message, metadata, created_at)
         values ($1, $2, 'failed', 'twilio_verify', $3, $4, $5, 'Invalid OTP', $6::jsonb, now())`,
        params: [
          randomUUID(),
          normalizedPhone,
          ipAddress || null,
          userAgent || null,
          verifyResult.sid,
          JSON.stringify({ twilioStatus: verifyResult.status }),
        ],
      });
      return { success: false, message: "Invalid OTP", verified: false };
    }

    const client = await this.pool.connect();
    try {
      await client.query("begin");
      const existing = await client.query(
        `select id, email, name, role, avatar_url, auth_provider, phone_number, whatsapp
         from public.users
         where phone_number = $1 or whatsapp = $1
         limit 1`,
        [normalizedPhone]
      );
      let user = existing.rows[0] || null;
      let workspaceId;
      if (user) {
        const workspace = await client.query(
          "select workspace_id from public.workspace_members where user_id = $1 order by created_at asc limit 1",
          [user.id]
        );
        workspaceId = workspace.rows[0]?.workspace_id || randomUUID();
        await client.query(
          `update public.users
           set phone_number = $2,
               whatsapp = coalesce(whatsapp, $2),
               is_phone_verified = true,
               phone_verified_at = coalesce(phone_verified_at, now()),
               mobile_verified = true,
               mobile_verified_at = coalesce(mobile_verified_at, now()),
               failed_login_count = 0,
               locked_until = null,
               last_login_at = now(),
               last_active_at = now(),
               login_count = coalesce(login_count, 0) + 1,
               updated_at = now()
           where id = $1`,
          [user.id, normalizedPhone]
        );
        if (!workspace.rows[0]?.workspace_id) {
          await client.query(
            `insert into public.workspaces (id, name, owner_id, created_at, updated_at)
             values ($1, $2, $3, now(), now())`,
            [workspaceId, `${normalizedPhone}'s workspace`, user.id]
          );
          await client.query(
            `insert into public.workspace_members (workspace_id, user_id, role, created_at, updated_at)
             values ($1, $2, 'owner', now(), now())`,
            [workspaceId, user.id]
          );
        }
        user = { ...user, phone_number: normalizedPhone, whatsapp: user.whatsapp || normalizedPhone };
      } else {
        const userCount = await client.query("select count(*)::int as count from public.users");
        const role = userCount.rows[0]?.count === 0 ? "admin" : "user";
        const userId = randomUUID();
        workspaceId = randomUUID();
        const email = phoneAliasEmail(normalizedPhone);
        await client.query(
          `insert into public.users
             (id, email, phone_number, is_phone_verified, phone_verified_at, whatsapp,
              mobile_verified, mobile_verified_at, role, auth_provider, account_status,
              last_login_at, last_active_at, login_count, created_at, updated_at)
           values ($1, $2, $3, true, now(), $3, true, now(), $4, 'twilio', 'active',
                   now(), now(), 1, now(), now())`,
          [userId, email, normalizedPhone, role]
        );
        await client.query(
          `insert into public.workspaces (id, name, owner_id, created_at, updated_at)
           values ($1, $2, $3, now(), now())`,
          [workspaceId, `${normalizedPhone}'s workspace`, userId]
        );
        await client.query(
          `insert into public.workspace_members (workspace_id, user_id, role, created_at, updated_at)
           values ($1, $2, 'owner', now(), now())`,
          [workspaceId, userId]
        );
        user = {
          id: userId,
          email,
          name: normalizedPhone,
          role,
          avatar_url: null,
          auth_provider: "twilio",
          phone_number: normalizedPhone,
          whatsapp: normalizedPhone,
        };
      }

      await this.#safeTelemetryQuery({
        label: "CODRAI Twilio verified OTP log failed",
        queryable: client,
        sql:
        `insert into public.otp_logs
           (id, phone_number, status, provider, ip_address, user_agent, twilio_sid, metadata, created_at)
         values ($1, $2, 'verified', 'twilio_verify', $3, $4, $5, $6::jsonb, now())`,
        params: [
          randomUUID(),
          normalizedPhone,
          ipAddress || null,
          userAgent || null,
          verifyResult.sid,
          JSON.stringify({ twilioStatus: verifyResult.status }),
        ],
      });

      const sessionUser = {
        id: user.id,
        email: user.email,
        name: user.name || normalizedPhone,
        role: user.role || "user",
        avatarUrl: user.avatar_url || null,
        authProvider: user.auth_provider || "twilio",
        phoneNumber: normalizedPhone,
        whatsapp: user.whatsapp || normalizedPhone,
        phoneVerified: true,
        mobileVerified: true,
      };
      const session = await this.#createSession({
        userId: user.id,
        email: user.email,
        workspaceId,
        rememberMe,
        userAgent,
        ipAddress,
        user: sessionUser,
        queryable: client,
        deviceFingerprint,
        deviceName,
        authMethod: "twilio_verify",
      });
      await this.#audit({
        workspaceId,
        userId: user.id,
        action: "auth.twilio_otp.verified",
        targetId: normalizedPhone,
        metadata: { phone: maskMobile(normalizedPhone), provider: "twilio_verify" },
        queryable: client,
      });
      await client.query("commit");
      return { ...session, success: true, verified: true };
    } catch (error) {
      await client.query("rollback").catch(() => {});
      if (error.code === "23505") {
        throw Object.assign(new Error("An account already exists with this phone number."), { statusCode: 409 });
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async cleanupExpiredChallenges() {
    this.#assertConfigured();
    const stale = await this.pool.query(
      `select metadata
       from public.auth_otp_challenges
       where (expires_at < now() - interval '24 hours')
          or (consumed_at is not null and consumed_at < now() - interval '24 hours')`
    );
    if (this.supabaseAuth.configured) {
      for (const row of stale.rows) {
        const userId = row.metadata?.supabaseAuthCreated ? row.metadata?.supabaseAuthUserId : null;
        if (!userId) continue;
        const linked = await this.pool.query(
          "select 1 from public.users where supabase_auth_user_id = $1::uuid limit 1",
          [userId]
        );
        if (!linked.rows[0]) {
          await this.supabaseAuth.deleteUser(userId).catch((error) => {
            console.warn("Supabase pending identity cleanup degraded:", error.message);
          });
        }
      }
    }
    const result = await this.pool.query(
      `delete from public.auth_otp_challenges
       where (expires_at < now() - interval '24 hours')
          or (consumed_at is not null and consumed_at < now() - interval '24 hours')`
    );
    return { deleted: result.rowCount || 0 };
  }

  async #issueOtpChallenge({
    purpose,
    authMethod,
    email,
    whatsapp = null,
    userId = null,
    fullName = null,
    passwordHash = null,
    metadata = {},
    rememberMe = true,
    userAgent,
    ipAddress,
    countryCode = null,
    countryName = null,
    timezone = "UTC",
    languagePreference = "en",
  }) {
    await this.cleanupExpiredChallenges().catch((error) => {
      console.warn("CODRAI OTP cleanup degraded:", error.message);
    });

    const normalizedEmail = requireValidEmail(email);
    const normalizedWhatsapp = whatsapp ? normalizeGlobalMobile(whatsapp).mobile : null;
    const recent = await this.pool.query(
      `select resend_available_at
       from public.auth_otp_challenges
       where email = $1
         and auth_method = $2
         and purpose = $3
         and consumed_at is null
       order by created_at desc
       limit 1`,
      [normalizedEmail, authMethod, purpose]
    );
    if (recent.rows[0] && new Date(recent.rows[0].resend_available_at).getTime() > Date.now()) {
      const retryAfter = Math.ceil((new Date(recent.rows[0].resend_available_at).getTime() - Date.now()) / 1000);
      throw Object.assign(new Error(`Please wait ${retryAfter} seconds before requesting another code.`), {
        statusCode: 429,
        retryAfter,
      });
    }

    const challengeId = randomUUID();
    const code = String(randomInt(100000, 1000000));
    const codeHash = otpHash({ challengeId, email: normalizedEmail, code });
    const expiresInMinutes = env.otpExpiryMinutes;
    const channels = normalizedWhatsapp ? ["email", "sms"] : ["email"];

    await this.pool.query(
      `insert into public.auth_otp_challenges
         (id, user_id, email, purpose, auth_method, code_hash, pending_password_hash,
          metadata, full_name, whatsapp, remember_me, expires_at, resend_available_at,
          requested_ip, user_agent, country_code, country_name, timezone,
          language_preference, delivery_channels, created_at)
       values
         ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11,
          now() + ($12::int * interval '1 minute'), now() + interval '60 seconds',
          $13, $14, $15, $16, $17, $18, $19::text[], now())`,
      [
        challengeId,
        userId,
        normalizedEmail,
        purpose,
        authMethod,
        codeHash,
        passwordHash,
        JSON.stringify(metadata),
        fullName,
        normalizedWhatsapp,
        rememberMe !== false,
        expiresInMinutes,
        ipAddress || null,
        userAgent || null,
        countryCode,
        countryName,
        timezone,
        languagePreference,
        channels,
      ]
    );

    const delivery = await new OtpDeliveryService({ redis: this.redis }).deliver({
      challengeId,
      email: normalizedEmail,
      mobile: normalizedWhatsapp,
      code,
      purpose,
      expiresInMinutes,
      countryCode,
      languagePreference,
    });
    console.info("AUTH OTP DELIVERY RESULT", {
      challengeId,
      purpose,
      authMethod,
      emailDelivered: Boolean(delivery.email?.delivered),
      smsDelivered: normalizedWhatsapp ? Boolean(delivery.sms?.delivered) : null,
      delivered: Boolean(delivery.delivered),
      verificationMethod: delivery.verificationMethod || "email",
      emailAttempts: delivery.email?.attempts?.map((attempt) => ({ provider: attempt.provider, status: attempt.status })) || [],
      smsAttempts: delivery.sms?.attempts?.map((attempt) => ({ provider: attempt.provider, status: attempt.status })) || [],
    });

    for (const channel of channels) {
      const channelDelivery = delivery[channel];
      const attempts = channelDelivery?.attempts?.length
        ? channelDelivery.attempts
        : [{
          provider: channelDelivery?.provider || "unconfigured",
          status: channelDelivery?.delivered ? "sent" : "failed",
          messageId: channelDelivery?.messageId,
          error: channelDelivery?.error,
        }];
      for (const attempt of attempts) {
        await this.#safeTelemetryQuery({
          label: "CODRAI OTP delivery event write failed",
          queryable: this.pool,
          sql: `insert into public.auth_otp_delivery_events
             (id, challenge_id, channel, provider, status, provider_message_id, error_message, created_at)
           values ($1, $2, $3, $4, $5, $6, $7, now())`,
          params: [
            randomUUID(),
            challengeId,
            channel,
            attempt.provider || "unconfigured",
            attempt.status,
            attempt.messageId || null,
            attempt.error || null,
          ],
        });
      }
    }

    if (!delivery.delivered) {
      await this.pool.query(
        "update public.auth_otp_challenges set delivery_status = 'failed' where id = $1",
        [challengeId]
      );
      console.error("AUTH OTP DELIVERY FAILED", {
        challengeId,
        purpose,
        authMethod,
        email: maskEmail(normalizedEmail),
        whatsapp: maskMobile(normalizedWhatsapp),
        emailError: delivery.email?.error || null,
        smsError: delivery.sms?.error || null,
      });
      return {
        status: "otp_delivery_failed",
        challengeId,
        purpose,
        authMethod,
        email: maskEmail(normalizedEmail),
        mobile: maskMobile(normalizedWhatsapp),
        channels,
        expiresInSeconds: expiresInMinutes * 60,
        resendAfterSeconds: 60,
        delivery: {
          delivered: false,
          email: {
            delivered: Boolean(delivery.email?.delivered),
            attempts: delivery.email?.attempts || [],
            error: delivery.email?.error || null,
          },
          sms: normalizedWhatsapp ? {
            delivered: Boolean(delivery.sms?.delivered),
            attempts: delivery.sms?.attempts || [],
            error: delivery.sms?.error || null,
          } : null,
        },
        message: "Your account credentials were saved, but CODRAI could not deliver the verification code. Check email/SMS provider configuration and resend the OTP.",
      };
    }

    await this.pool.query(
      "update public.auth_otp_challenges set delivery_status = 'sent' where id = $1",
      [challengeId]
    );
    await this.#audit({
      userId,
      action: "auth.mfa.challenge_sent",
      targetId: challengeId,
      metadata: {
        purpose,
        authMethod,
        email: maskEmail(normalizedEmail),
        mobile: maskMobile(normalizedWhatsapp),
        channels,
      },
    });

    return {
      status: "otp_required",
      challengeId,
      purpose,
      authMethod,
      email: maskEmail(normalizedEmail),
      mobile: maskMobile(normalizedWhatsapp),
      channels,
      success: true,
      verification_method: delivery.verificationMethod || "email",
      delivery: {
        delivered: true,
        email: {
          delivered: Boolean(delivery.email?.delivered),
          attempts: delivery.email?.attempts || [],
        },
        sms: normalizedWhatsapp ? {
          delivered: Boolean(delivery.sms?.delivered),
          attempts: delivery.sms?.attempts || [],
          error: delivery.sms?.error || null,
          optional: true,
        } : null,
      },
      expiresInSeconds: expiresInMinutes * 60,
      resendAfterSeconds: 60,
      ...(delivery.developmentCode ? { developmentCode: delivery.developmentCode } : {}),
    };
  }

  async resendOtp({ challengeId, userAgent, ipAddress }) {
    this.#assertConfigured();
    const result = await this.pool.query(
      `select *
       from public.auth_otp_challenges
       where id = $1
         and consumed_at is null
       limit 1`,
      [challengeId]
    );
    const challenge = result.rows[0];
    if (!challenge) {
      throw Object.assign(new Error("This verification request is no longer active."), { statusCode: 400 });
    }
    if (new Date(challenge.resend_available_at).getTime() > Date.now()) {
      const retryAfter = Math.ceil((new Date(challenge.resend_available_at).getTime() - Date.now()) / 1000);
      throw Object.assign(new Error(`Please wait ${retryAfter} seconds before requesting another code.`), {
        statusCode: 429,
        retryAfter,
      });
    }
    const next = await this.#issueOtpChallenge({
      purpose: challenge.purpose,
      authMethod: challenge.auth_method,
      email: challenge.email,
      whatsapp: challenge.whatsapp,
      userId: challenge.user_id,
      fullName: challenge.full_name,
      passwordHash: challenge.pending_password_hash,
      metadata: challenge.metadata || {},
      rememberMe: challenge.remember_me,
      userAgent: userAgent || challenge.user_agent,
      ipAddress: ipAddress || challenge.requested_ip,
      countryCode: challenge.country_code,
      countryName: challenge.country_name,
      timezone: challenge.timezone,
      languagePreference: challenge.language_preference,
    });
    await this.pool.query(
      "update public.auth_otp_challenges set consumed_at = now() where id = $1",
      [challengeId]
    );
    return next;
  }

  async requestOtp({
    identifier, email, purpose = "signup", name, whatsapp, countryCode, timezone,
    languagePreference, rememberMe = true, userAgent, ipAddress, termsAccepted, privacyAccepted,
  }) {
    this.#assertConfigured();
    if (!["signup", "login"].includes(purpose)) {
      throw Object.assign(new Error("OTP purpose must be signup or login."), { statusCode: 400 });
    }

    let normalizedEmail;
    let normalizedWhatsapp;
    let identity;
    let existingUser;
    if (purpose === "signup") {
      normalizedEmail = normalizeEmail(email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        throw Object.assign(new Error("Enter a valid email address."), { statusCode: 400 });
      }
      identity = normalizeGlobalMobile(whatsapp);
      normalizedWhatsapp = identity.mobile;
      const existing = await this.pool.query(
        `select id
         from public.users
         where lower(email) = $1 or whatsapp = $2
         limit 1`,
        [normalizedEmail, normalizedWhatsapp]
      );
      if (existing.rows[0]) {
        throw Object.assign(new Error("An account already exists with this email or mobile number. Choose Log in instead."), { statusCode: 409 });
      }
      if (!termsAccepted || !privacyAccepted) {
        throw Object.assign(new Error("You must accept the Terms & Conditions and Privacy Policy."), { statusCode: 400 });
      }
    } else {
      const loginIdentifier = String(identifier || email || whatsapp || "").trim();
      if (!loginIdentifier) {
        throw Object.assign(new Error("Enter your email address or mobile number."), { statusCode: 400 });
      }
      const byEmail = loginIdentifier.includes("@");
      const lookupEmail = byEmail ? normalizeEmail(loginIdentifier) : null;
      const loginMobile = byEmail ? null : normalizeGlobalMobile(loginIdentifier);
      const lookupMobile = loginMobile?.mobile || null;
      const existing = await this.pool.query(
        `select id, name, email, whatsapp
         from public.users
         where ($1::text is not null and lower(email) = $1)
            or ($2::text is not null and whatsapp = $2)
         limit 1`,
        [lookupEmail, lookupMobile]
      );
      existingUser = existing.rows[0];
      if (!existingUser) {
        throw Object.assign(new Error("No CODRAI account exists for that email or mobile number."), { statusCode: 404 });
      }
      if (!existingUser.email || !existingUser.whatsapp) {
        throw Object.assign(new Error("This account is missing a verified delivery channel. Use Google sign-in or contact support."), { statusCode: 409 });
      }
      const lock = await this.pool.query(
        "select locked_until, account_status from public.users where id = $1",
        [existingUser.id]
      );
      if (lock.rows[0]?.account_status !== "active") {
        throw Object.assign(new Error("This account is not active. Contact CODRAI support."), { statusCode: 403 });
      }
      if (lock.rows[0]?.locked_until && new Date(lock.rows[0].locked_until).getTime() > Date.now()) {
        throw Object.assign(new Error("This account is temporarily locked after repeated failed attempts."), { statusCode: 423 });
      }
      normalizedEmail = normalizeEmail(existingUser.email);
      identity = normalizeGlobalMobile(existingUser.whatsapp);
      normalizedWhatsapp = identity.mobile;
    }
    identity ||= normalizeGlobalMobile(normalizedWhatsapp);
    const resolvedCountryCode = identity.countryCode || String(countryCode || "").toUpperCase() || null;
    const resolvedTimezone = normalizeTimezone(timezone);
    const resolvedLanguage = normalizeLanguage(languagePreference);

    const fullName = purpose === "signup" ? String(name || "").trim() : existingUser?.name;
    if (purpose === "signup" && fullName.length < 2) {
      throw Object.assign(new Error("Full name is required."), { statusCode: 400 });
    }
    if (purpose === "signup" && !normalizedWhatsapp) {
      throw Object.assign(new Error("Mobile number is required."), { statusCode: 400 });
    }

    const recent = await this.pool.query(
      `select resend_available_at
       from public.auth_otp_challenges
       where (email = $1 or whatsapp = $2)
         and purpose = $3
         and consumed_at is null
       order by created_at desc limit 1`,
      [normalizedEmail, normalizedWhatsapp, purpose]
    );
    if (recent.rows[0] && new Date(recent.rows[0].resend_available_at).getTime() > Date.now()) {
      const retryAfter = Math.ceil((new Date(recent.rows[0].resend_available_at).getTime() - Date.now()) / 1000);
      throw Object.assign(new Error(`Please wait ${retryAfter} seconds before requesting another code.`), { statusCode: 429, retryAfter });
    }

    const challengeId = randomUUID();
    const code = String(randomInt(100000, 1000000));
    const codeHash = otpHash({ challengeId, email: normalizedEmail, code });
    const expiresInMinutes = env.otpExpiryMinutes;

    await this.pool.query(
      `insert into public.auth_otp_challenges
       (id, email, purpose, code_hash, full_name, whatsapp, remember_me, expires_at,
          resend_available_at, requested_ip, user_agent, country_code, country_name, timezone, language_preference, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, now() + ($8::int * interval '1 minute'),
               now() + interval '60 seconds', $9, $10, $11, $12, $13, $14, now())`,
      [challengeId, normalizedEmail, purpose, codeHash, fullName || null, normalizedWhatsapp, rememberMe !== false, expiresInMinutes, ipAddress || null, userAgent || null, resolvedCountryCode, identity.countryName, resolvedTimezone, resolvedLanguage]
    );

    const delivery = await new OtpDeliveryService({ redis: this.redis }).deliver({
      challengeId,
      email: normalizedEmail,
      mobile: normalizedWhatsapp,
      code,
      purpose,
      expiresInMinutes,
      countryCode: resolvedCountryCode,
      languagePreference: resolvedLanguage,
    });
    const channels = ["email", "sms"];
    for (const channel of channels) {
      const channelDelivery = delivery[channel];
      const attempts = channelDelivery?.attempts?.length
        ? channelDelivery.attempts
        : [{ provider: channelDelivery?.provider || "unconfigured", status: channelDelivery?.delivered ? "sent" : "failed", messageId: channelDelivery?.messageId, error: channelDelivery?.error }];
      for (const attempt of attempts) await this.#safeTelemetryQuery({
        label: "CODRAI OTP delivery event write failed",
        queryable: this.pool,
        sql: `insert into public.auth_otp_delivery_events
           (id, challenge_id, channel, provider, status, provider_message_id, error_message, created_at)
         values ($1, $2, $3, $4, $5, $6, $7, now())`,
        params: [
          randomUUID(),
          challengeId,
          channel,
          attempt.provider || "unconfigured",
          attempt.status,
          attempt.messageId || null,
          attempt.error || null,
        ],
      });
    }

    if (!delivery.delivered) {
      await this.pool.query(
        "update public.auth_otp_challenges set delivery_status = 'failed' where id = $1",
        [challengeId]
      );
      await this.#audit({
        action: "auth.otp.delivery_failed",
        targetId: challengeId,
        metadata: { purpose, email: maskEmail(normalizedEmail), mobile: maskMobile(normalizedWhatsapp) },
      });
      throw Object.assign(new Error("We could not deliver the verification code by email. Please retry shortly."), {
        statusCode: 502,
      });
    }

    await this.pool.query(
      "update public.auth_otp_challenges set delivery_status = 'sent' where id = $1",
      [challengeId]
    );
    await this.#audit({
      action: "auth.otp.sent",
      targetId: challengeId,
      metadata: { purpose, email: maskEmail(normalizedEmail), mobile: maskMobile(normalizedWhatsapp), channels },
    });
    const developmentCode = delivery.developmentCode;

    return {
      status: "otp_sent",
      challengeId,
      email: maskEmail(normalizedEmail),
      mobile: maskMobile(normalizedWhatsapp),
      countryCode: resolvedCountryCode,
      channels,
      success: true,
      verification_method: delivery.verificationMethod || "email",
      delivery: {
        delivered: true,
        email: {
          delivered: Boolean(delivery.email?.delivered),
          attempts: delivery.email?.attempts || [],
          error: delivery.email?.error || null,
        },
        sms: normalizedWhatsapp ? {
          delivered: Boolean(delivery.sms?.delivered),
          attempts: delivery.sms?.attempts || [],
          error: delivery.sms?.error || null,
          optional: true,
        } : null,
      },
      purpose,
      expiresInSeconds: expiresInMinutes * 60,
      resendAfterSeconds: 60,
      ...(developmentCode ? { developmentCode } : {}),
    };
  }

  async verifyOtp({ challengeId, code, userAgent, ipAddress, deviceFingerprint, deviceName }) {
    this.#assertConfigured();
    if (!challengeId || !/^\d{6}$/.test(String(code || ""))) {
      throw Object.assign(new Error("Enter the complete 6-digit verification code."), { statusCode: 400 });
    }

    const client = await this.pool.connect();
    let cleanupMetadata = {};
    let otpVerified = false;
    try {
      await client.query("begin");
      const challengeResult = await client.query(
        `select *
         from public.auth_otp_challenges
         where id = $1
         for update`,
        [challengeId]
      );
      const challenge = challengeResult.rows[0];
      cleanupMetadata = challenge?.metadata || {};
      if (!challenge || challenge.consumed_at) {
        throw Object.assign(new Error("This verification request is no longer active."), { statusCode: 400 });
      }
      if (challenge.delivery_status !== "sent") {
        throw Object.assign(new Error("This verification request was not delivered successfully."), { statusCode: 400 });
      }
      if (new Date(challenge.expires_at).getTime() <= Date.now()) {
        throw Object.assign(new Error("The verification code has expired. Request a new code."), { statusCode: 410 });
      }
      if (challenge.attempts >= challenge.max_attempts) {
        throw Object.assign(new Error("Too many incorrect attempts. Request a new code."), { statusCode: 429 });
      }

      const suppliedHash = otpHash({ challengeId, email: challenge.email, code: String(code) });
      if (!otpMatches(challenge.code_hash, suppliedHash)) {
        await client.query(
          "update public.auth_otp_challenges set attempts = attempts + 1 where id = $1",
          [challengeId]
        );
        await this.#audit({
          action: "auth.otp.verification_failed",
          targetId: challengeId,
          metadata: { purpose: challenge.purpose, attempt: challenge.attempts + 1 },
          queryable: client,
        });
        if (challenge.purpose === "login") {
          await client.query(
            `update public.users
             set failed_login_count = failed_login_count + 1,
                 locked_until = case when failed_login_count + 1 >= 5 then now() + interval '15 minutes' else locked_until end,
                 updated_at = now()
             where lower(email) = $1`,
            [challenge.email]
          );
        }
        await this.#recordLogin({
          method: "dual_otp",
          success: false,
          ipAddress,
          userAgent,
          deviceFingerprint,
          countryCode: challenge.country_code,
          failureReason: "invalid_otp",
          queryable: client,
        });
        await client.query("commit");
        throw Object.assign(new Error("The verification code is incorrect."), { statusCode: 400, transactionCommitted: true });
      }
      otpVerified = true;

      let user;
      let workspaceId;
      let createdSupabaseIdentity = null;
      const challengeMetadata = challenge.metadata || {};
      const authMethod = challenge.auth_method || "otp";
      if (challenge.purpose === "signup") {
        const attachExistingUserId = challengeMetadata.attachExistingUserId || null;
        const existing = await client.query(
          `select id, email, name, whatsapp, role, avatar_url, auth_provider, password_hash,
                  supabase_auth_user_id, country_code, country_name, timezone, language_preference
           from public.users
           where lower(email) = $1
           limit 1`,
          [challenge.email]
        );
        if (existing.rows[0] && existing.rows[0].id !== attachExistingUserId) {
          throw Object.assign(new Error("An account already exists for this email."), { statusCode: 409 });
        }
        if (attachExistingUserId && !existing.rows[0]) {
          throw Object.assign(new Error("The account linked to this verification request no longer exists."), { statusCode: 404 });
        }

        if (env.supabaseAuthRequired && !this.supabaseAuth.configured) {
          throw Object.assign(new Error("Supabase Auth is required but not configured."), {
            statusCode: 503,
            code: "SUPABASE_AUTH_NOT_CONFIGURED",
          });
        }
        if (authMethod === "password" && challengeMetadata.supabaseAuthUserId) {
          createdSupabaseIdentity = {
            status: "pending_confirmation",
            user: { id: challengeMetadata.supabaseAuthUserId },
            created: Boolean(challengeMetadata.supabaseAuthCreated),
          };
        } else if (authMethod === "password" && attachExistingUserId && challengeMetadata.supabaseAuthUserId) {
          createdSupabaseIdentity = {
            status: "existing_completed",
            user: { id: challengeMetadata.supabaseAuthUserId },
            created: false,
          };
        } else if (authMethod === "google" && this.supabaseAuth.configured) {
          try {
            createdSupabaseIdentity = await this.supabaseAuth.createExternalUser({
              email: challenge.email,
              name: challengeMetadata.fullName || challenge.full_name,
              avatarUrl: challengeMetadata.avatarUrl,
              phone: challenge.whatsapp || null,
              provider: "google",
            });
          } catch (error) {
            if (env.supabaseAuthRequired) throw error;
            console.warn("SUPABASE AUTH MFA SIGNUP DEGRADED", {
              email: maskEmail(challenge.email),
              code: error.code || "SUPABASE_AUTH_ERROR",
              message: error.message,
            });
          }
        }

        const existingUser = existing.rows[0] || null;
        const userCount = await client.query("select count(*)::int as count from public.users");
        const role = existingUser?.role || (userCount.rows[0]?.count === 0 ? "admin" : "user");
        let userId;
        if (existingUser) {
          if (existingUser.password_hash && authMethod === "password" && !attachExistingUserId) {
            throw Object.assign(new Error("This account already has password credentials."), { statusCode: 409 });
          }
          userId = existingUser.id;
          const workspace = await client.query(
            "select workspace_id from public.workspace_members where user_id = $1 order by created_at asc limit 1",
            [userId]
          );
          workspaceId = workspace.rows[0]?.workspace_id || randomUUID();
          await client.query(
            `update public.users
             set supabase_auth_user_id = coalesce(supabase_auth_user_id, $2::uuid),
                 password_hash = case when $3 = 'password' then $4 else password_hash end,
                 name = coalesce($5, name),
                 whatsapp = coalesce(whatsapp, $6),
                 email_verified = true,
                 email_verified_at = coalesce(email_verified_at, now()),
                 mobile_verified = case when $6::text is not null then true else mobile_verified end,
                 mobile_verified_at = case when $6::text is not null then coalesce(mobile_verified_at, now()) else mobile_verified_at end,
                 country_code = coalesce(country_code, $7),
                 country_name = coalesce(country_name, $8),
                 timezone = coalesce(timezone, $9),
                 language_preference = coalesce(language_preference, $10),
                 terms_accepted_at = coalesce(terms_accepted_at, now()),
                 privacy_accepted_at = coalesce(privacy_accepted_at, now()),
                 failed_login_count = 0,
                 locked_until = null,
                 last_login_at = now(),
                 last_active_at = now(),
                 login_count = coalesce(login_count, 0) + 1,
                 updated_at = now()
             where id = $1`,
            [
              userId,
              createdSupabaseIdentity?.user?.id || null,
              authMethod,
              challenge.pending_password_hash,
              challengeMetadata.fullName || challenge.full_name,
              challenge.whatsapp,
              challenge.country_code,
              challenge.country_name,
              challenge.timezone,
              challenge.language_preference,
            ]
          );
          if (!workspace.rows[0]?.workspace_id) {
            await client.query(
              `insert into public.workspaces (id, name, owner_id, created_at, updated_at)
               values ($1, $2, $3, now(), now())`,
              [workspaceId, `${challenge.full_name || existingUser.name || challenge.email}'s workspace`, userId]
            );
            await client.query(
              `insert into public.workspace_members (workspace_id, user_id, role, created_at, updated_at)
               values ($1, $2, 'owner', now(), now())`,
              [workspaceId, userId]
            );
          }
        } else {
          userId = createdSupabaseIdentity?.user?.id || randomUUID();
          workspaceId = randomUUID();
          await client.query(
            `insert into public.users
               (id, supabase_auth_user_id, email, password_hash, name, whatsapp, role, email_verified, email_verified_at,
                mobile_verified, mobile_verified_at, auth_provider, country_code, country_name,
                timezone, language_preference, terms_accepted_at, privacy_accepted_at,
                last_login_at, last_active_at, login_count, created_at, updated_at)
             values ($1, $2, $3, $4, $5, $6, $7, true, now(), $8, $9, $10, $11, $12,
                     $13, $14, now(), now(), now(), now(), 1, now(), now())`,
            [
              userId,
              createdSupabaseIdentity?.user?.id || null,
              challenge.email,
              authMethod === "password" ? challenge.pending_password_hash : null,
              challengeMetadata.fullName || challenge.full_name,
              challenge.whatsapp,
              role,
              Boolean(challenge.whatsapp),
              challenge.whatsapp ? new Date() : null,
              authMethod,
              challenge.country_code,
              challenge.country_name,
              challenge.timezone,
              challenge.language_preference,
            ]
          );
          await client.query(
            `insert into public.workspaces (id, name, owner_id, created_at, updated_at)
             values ($1, $2, $3, now(), now())`,
            [workspaceId, `${challenge.full_name}'s workspace`, userId]
          );
          await client.query(
            `insert into public.workspace_members (workspace_id, user_id, role, created_at, updated_at)
             values ($1, $2, 'owner', now(), now())`,
            [workspaceId, userId]
          );
        }
        if (authMethod === "google") {
          await this.#upsertGoogleIdentity({
            queryable: client,
            userId,
            googleId: challengeMetadata.googleId,
            email: challenge.email,
            fullName: challengeMetadata.fullName || challenge.full_name,
            avatarUrl: challengeMetadata.avatarUrl || null,
          });
        }
        user = {
          id: userId,
          email: challenge.email,
          name: challengeMetadata.fullName || challenge.full_name || existingUser?.name,
          whatsapp: challenge.whatsapp,
          role,
          emailVerified: true,
          mobileVerified: Boolean(challenge.whatsapp),
          avatarUrl: challengeMetadata.avatarUrl || null,
          authProvider: authMethod,
          googleId: challengeMetadata.googleId || null,
          countryCode: challenge.country_code,
          country: challenge.country_name,
          timezone: challenge.timezone,
          languagePreference: challenge.language_preference,
        };
      } else {
        const userResult = await client.query(
          `select id, email, name, whatsapp, role, avatar_url, auth_provider,
                  country_code, country_name, timezone, language_preference
           from public.users
           where ($1::text is not null and id = $1) or lower(email) = $2
           order by case when id = $1 then 0 else 1 end
           limit 1`,
          [challenge.user_id, challenge.email]
        );
        const row = userResult.rows[0];
        if (!row) throw Object.assign(new Error("Account not found."), { statusCode: 404 });
        const workspace = await client.query(
          "select workspace_id from public.workspace_members where user_id = $1 order by created_at asc limit 1",
          [row.id]
        );
        workspaceId = workspace.rows[0]?.workspace_id;
        await client.query(
          `update public.users
           set email_verified = true,
               email_verified_at = coalesce(email_verified_at, now()),
               mobile_verified = case when $2::boolean then true else mobile_verified end,
               mobile_verified_at = case when $2::boolean then coalesce(mobile_verified_at, now()) else mobile_verified_at end,
               avatar_url = coalesce($3, avatar_url),
               name = coalesce($4, name),
               auth_provider = case when $5 = 'google' then 'google' else auth_provider end,
               failed_login_count = 0,
               locked_until = null,
               last_login_at = now(),
               last_active_at = now(),
               login_count = coalesce(login_count, 0) + 1,
               updated_at = now()
           where id = $1`,
          [
            row.id,
            Boolean(challenge.whatsapp),
            challengeMetadata.avatarUrl || null,
            challengeMetadata.fullName || null,
            authMethod,
          ]
        );
        if (authMethod === "google") {
          await this.#upsertGoogleIdentity({
            queryable: client,
            userId: row.id,
            googleId: challengeMetadata.googleId,
            email: challenge.email,
            fullName: challengeMetadata.fullName || row.name,
            avatarUrl: challengeMetadata.avatarUrl || row.avatar_url,
          });
        }
        user = {
          id: row.id,
          email: row.email,
          name: challengeMetadata.fullName || row.name,
          whatsapp: row.whatsapp,
          role: row.role || "user",
          avatarUrl: challengeMetadata.avatarUrl || row.avatar_url || null,
          emailVerified: true,
          mobileVerified: Boolean(row.whatsapp),
          authProvider: authMethod === "google" ? "google" : row.auth_provider || "password",
          googleId: challengeMetadata.googleId || null,
          countryCode: row.country_code,
          country: row.country_name,
          timezone: row.timezone,
          languagePreference: row.language_preference,
        };
      }

      await client.query(
        "update public.auth_otp_challenges set consumed_at = now(), verified_at = now() where id = $1",
        [challengeId]
      );
      await this.#audit({
        workspaceId,
        userId: user.id,
        action: "auth.otp.verified",
        targetId: challengeId,
        metadata: { purpose: challenge.purpose, authMethod, channels: challenge.delivery_channels || ["email"] },
        queryable: client,
      });
      const session = await this.#createSession({
        userId: user.id,
        email: user.email,
        workspaceId,
        rememberMe: challenge.remember_me,
        userAgent: userAgent || challenge.user_agent,
        ipAddress: ipAddress || challenge.requested_ip,
        user,
        queryable: client,
        deviceFingerprint,
        deviceName,
        authMethod,
        countryCode: challenge.country_code,
      });
      if (authMethod === "password" && createdSupabaseIdentity?.user?.id) {
        await this.supabaseAuth.confirmEmail(createdSupabaseIdentity.user.id).catch((error) => {
          if (env.supabaseAuthRequired) throw error;
          console.warn("SUPABASE AUTH MFA CONFIRMATION DEGRADED", {
            userId: user.id,
            code: error.code || "SUPABASE_AUTH_ERROR",
            message: error.message,
          });
        });
      }
      await client.query("commit");
      return session;
    } catch (error) {
      if (!error.transactionCommitted) await client.query("rollback").catch(() => {});
      if (otpVerified && cleanupMetadata.supabaseAuthCreated && cleanupMetadata.supabaseAuthUserId) {
        await this.supabaseAuth.deleteUser(cleanupMetadata.supabaseAuthUserId).catch(() => {});
      }
      if (error.code === "23505") {
        throw Object.assign(new Error("An account already exists with this email or WhatsApp number."), { statusCode: 409 });
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async userAnalytics() {
    this.#assertConfigured();
    const [summary, countries, dailySignups, deliveryProviders, loginAnalytics] = await Promise.all([
      this.pool.query(`
        select
          count(*)::int as total_users,
          count(*) filter (where created_at >= now() - interval '30 days')::int as new_signups,
          count(*) filter (where last_login_at >= now() - interval '30 days')::int as active_users,
          count(*) filter (where email_verified = true or email_verified_at is not null)::int as verified_users,
          count(*) filter (where mobile_verified = true or mobile_verified_at is not null)::int as mobile_verified_users,
          (select count(distinct challenge_id)::int from public.auth_otp_delivery_events where status = 'sent') as total_otp_sent,
          (select count(*)::int from public.auth_otp_delivery_events where channel = 'email' and status = 'sent') as email_otp_count,
          (select count(*)::int from public.auth_otp_delivery_events where channel = 'sms' and status = 'sent') as sms_otp_count,
          (select count(*)::int from public.auth_otp_challenges where verified_at is not null) as successful_verifications,
          (select coalesce(sum(attempts), 0)::int from public.auth_otp_challenges) as failed_verifications
        from public.users
      `),
      this.pool.query(`
        select coalesce(country_code, 'unknown') as country_code,
               max(country_name) as country_name,
               count(*)::int as users
        from public.users
        group by country_code
        order by users desc
        limit 30
      `),
      this.pool.query(`
        select created_at::date as date, count(*)::int as signups
        from public.users
        where created_at >= current_date - interval '29 days'
        group by created_at::date
        order by date
      `),
      this.pool.query(`
        select channel, provider, status, count(*)::int as deliveries
        from public.auth_otp_delivery_events
        group by channel, provider, status
        order by channel, deliveries desc
      `),
      this.pool.query(`
        select method, success, count(*)::int as attempts
        from public.login_history
        where created_at >= now() - interval '30 days'
        group by method, success
        order by method, success desc
      `),
    ]);
    return {
      ...summary.rows[0],
      countryUsers: countries.rows,
      dailySignups: dailySignups.rows,
      deliveryProviders: deliveryProviders.rows,
      loginAnalytics: loginAnalytics.rows,
    };
  }

  async exportUsers() {
    this.#assertConfigured();
    const result = await this.pool.query(`
      select id, name, email, whatsapp, country_code, country_name, timezone, language_preference,
             kyc_status, account_status, role, auth_provider,
             (email_verified = true or email_verified_at is not null) as email_verified,
             (mobile_verified = true or mobile_verified_at is not null) as mobile_verified,
             created_at, last_login_at
      from public.users
      order by created_at desc
    `);
    return result.rows;
  }

  async exportOtpAnalytics() {
    this.#assertConfigured();
    const result = await this.pool.query(`
      select
        c.id as challenge_id,
        c.purpose,
        c.email,
        c.whatsapp as mobile,
        c.delivery_status,
        c.attempts as failed_attempts,
        (c.verified_at is not null) as verified,
        c.created_at,
        c.expires_at,
        c.verified_at,
        max(case when e.channel = 'email' then e.provider end) as email_provider,
        max(case when e.channel = 'email' then e.status end) as email_status,
        max(case when e.channel = 'sms' then e.provider end) as sms_provider,
        max(case when e.channel = 'sms' then e.status end) as sms_status
      from public.auth_otp_challenges c
      left join public.auth_otp_delivery_events e on e.challenge_id = c.id
      group by c.id
      order by c.created_at desc
    `);
    return result.rows;
  }

  async signup({
    email,
    whatsapp,
    password,
    name,
    rememberMe = false,
    userAgent,
    ipAddress,
    deviceFingerprint,
    deviceName,
    countryCode,
    timezone,
    languagePreference,
    termsAccepted = true,
    privacyAccepted = true,
  }) {
    this.#assertConfigured();
    const normalizedEmail = requireValidEmail(email);
    const identity = normalizeGlobalMobile(whatsapp);
    const fullName = String(name || "").trim();
    if (fullName.length < 2) {
      throw Object.assign(new Error("Full name is required."), { statusCode: 400 });
    }
    if (!identity.mobile) {
      throw Object.assign(new Error("WhatsApp number with country code is required."), { statusCode: 400 });
    }
    if (!password) {
      throw Object.assign(new Error("Password is required."), { statusCode: 400 });
    }
    if (password.length < 8) {
      throw Object.assign(new Error("Password must be at least 8 characters."), { statusCode: 400 });
    }
    if (!termsAccepted || !privacyAccepted) {
      throw Object.assign(new Error("You must accept the Terms & Conditions and Privacy Policy."), { statusCode: 400 });
    }
    const existingByEmail = await this.pool.query(
      `select id, email, whatsapp, password_hash, auth_provider, supabase_auth_user_id, email_verified, email_verified_at
       from public.users
       where lower(email) = $1
       limit 1`,
      [normalizedEmail]
    );
    const existingByWhatsapp = await this.pool.query(
      `select id, email, whatsapp, password_hash, auth_provider, supabase_auth_user_id
       from public.users
       where whatsapp = $1
       limit 1`,
      [identity.mobile]
    );
    const existingAccount = existingByEmail.rows[0] || null;
    const whatsappOwner = existingByWhatsapp.rows[0] || null;
    if (whatsappOwner && whatsappOwner.id !== existingAccount?.id) {
      throw Object.assign(new Error("An account already exists with this WhatsApp number."), { statusCode: 409 });
    }
    if (existingAccount?.password_hash) {
      throw Object.assign(new Error("An account already exists with this email address."), { statusCode: 409 });
    }
    if (existingAccount?.whatsapp && existingAccount.whatsapp !== identity.mobile) {
      throw Object.assign(new Error("This email is already linked to a different WhatsApp number."), { statusCode: 409 });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    console.info("AUTH SIGNUP HASH CREATED", {
      email: maskEmail(normalizedEmail),
      hasPasswordHash: Boolean(passwordHash),
      whatsapp: maskMobile(identity.mobile),
    });
    if (env.supabaseAuthRequired && !this.supabaseAuth.configured) {
      throw Object.assign(new Error("Supabase Auth is required but not configured."), {
        statusCode: 503,
        code: "SUPABASE_AUTH_NOT_CONFIGURED",
      });
    }
    let supabaseIdentity = { status: "disabled", user: null, created: false };
    if (this.supabaseAuth.configured) {
      try {
        if (existingAccount?.supabase_auth_user_id) {
          supabaseIdentity = await this.supabaseAuth.updateUser({
            userId: existingAccount.supabase_auth_user_id,
            email: normalizedEmail,
            password,
            phone: identity.mobile,
            name: fullName,
            emailConfirm: Boolean(existingAccount.email_verified || existingAccount.email_verified_at),
            phoneConfirm: false,
          });
          supabaseIdentity.created = false;
        } else {
          supabaseIdentity = await this.supabaseAuth.createPasswordUser({
            email: normalizedEmail,
            password,
            phone: identity.mobile,
            name: fullName,
            emailConfirm: false,
            phoneConfirm: false,
          });
        }
      } catch (error) {
        if (env.supabaseAuthRequired) throw error;
        console.warn("SUPABASE AUTH MFA SIGNUP DEGRADED", {
          email: maskEmail(normalizedEmail),
          code: error.code || "SUPABASE_AUTH_ERROR",
          message: error.message,
        });
      }
    }
    const credentialUserId = existingAccount?.id || supabaseIdentity.user?.id || randomUUID();
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      if (existingAccount) {
        console.info("AUTH SIGNUP COMPLETING EXISTING USER", {
          userId: credentialUserId,
          email: maskEmail(normalizedEmail),
          hadPasswordHash: Boolean(existingAccount.password_hash),
          hadWhatsapp: Boolean(existingAccount.whatsapp),
        });
        await client.query(
          `update public.users
           set supabase_auth_user_id = coalesce(supabase_auth_user_id, $2::uuid),
               password_hash = $3,
               name = coalesce($4, name),
               whatsapp = $5,
               mobile_verified = false,
               mobile_verified_at = null,
               country_code = coalesce($6, country_code),
               country_name = coalesce($7, country_name),
               timezone = coalesce($8, timezone),
               language_preference = coalesce($9, language_preference),
               terms_accepted_at = coalesce(terms_accepted_at, now()),
               privacy_accepted_at = coalesce(privacy_accepted_at, now()),
               account_status = coalesce(account_status, 'active'),
               auth_provider = case when auth_provider = 'google' then 'google' else 'password' end,
               failed_login_count = 0,
               locked_until = null,
               updated_at = now()
           where id = $1`,
          [
            credentialUserId,
            supabaseIdentity.user?.id || null,
            passwordHash,
            fullName,
            identity.mobile,
            identity.countryCode || countryCode || null,
            identity.countryName || null,
            normalizeTimezone(timezone),
            normalizeLanguage(languagePreference),
          ]
        );
      } else {
        const userCount = await client.query("select count(*)::int as count from public.users");
        const role = userCount.rows[0]?.count === 0 ? "admin" : "user";
        console.info("AUTH SIGNUP CREATING USER", {
          userId: credentialUserId,
          email: maskEmail(normalizedEmail),
          whatsapp: maskMobile(identity.mobile),
          role,
        });
        await client.query(
          `insert into public.users
             (id, supabase_auth_user_id, email, password_hash, name, whatsapp, role,
              email_verified, mobile_verified, auth_provider, country_code, country_name,
              timezone, language_preference, account_status, terms_accepted_at,
              privacy_accepted_at, login_count, created_at, updated_at)
           values ($1, $2, $3, $4, $5, $6, $7,
                   false, false, 'password', $8, $9,
                   $10, $11, 'active', now(),
                   now(), 0, now(), now())`,
          [
            credentialUserId,
            supabaseIdentity.user?.id || null,
            normalizedEmail,
            passwordHash,
            fullName,
            identity.mobile,
            role,
            identity.countryCode || countryCode || null,
            identity.countryName || null,
            normalizeTimezone(timezone),
            normalizeLanguage(languagePreference),
          ]
        );
      }
      await client.query("commit");
      console.info("AUTH SIGNUP USER COMMITTED", {
        userId: credentialUserId,
        email: maskEmail(normalizedEmail),
        hasPasswordHash: true,
        hasWhatsapp: true,
      });
    } catch (error) {
      await client.query("rollback").catch(() => {});
      console.error("AUTH SIGNUP USER PERSIST FAILED", {
        email: maskEmail(normalizedEmail),
        code: error.code || "SIGNUP_USER_PERSIST_FAILED",
        message: error.message,
      });
      throw error;
    } finally {
      client.release();
    }
    return await this.#issueOtpChallenge({
      purpose: "signup",
      authMethod: "password",
      email: normalizedEmail,
      whatsapp: identity.mobile,
      userId: credentialUserId,
      fullName,
      passwordHash,
      rememberMe,
      userAgent,
      ipAddress,
      countryCode: identity.countryCode || countryCode || null,
      countryName: identity.countryName || null,
      timezone: normalizeTimezone(timezone),
      languagePreference: normalizeLanguage(languagePreference),
      metadata: {
        deviceFingerprint: deviceFingerprint || null,
        deviceName: deviceName || null,
        termsAccepted: true,
        privacyAccepted: true,
        supabaseAuthUserId: supabaseIdentity.user?.id || null,
        supabaseAuthCreated: Boolean(supabaseIdentity.created),
        attachExistingUserId: credentialUserId,
      },
    });
  }

  async login({
    email,
    whatsapp,
    password,
    rememberMe = false,
    userAgent,
    ipAddress,
    deviceFingerprint,
    deviceName,
    countryCode,
  }) {
    this.#assertConfigured();
    const normalizedEmail = requireValidEmail(email);
    const identity = normalizeGlobalMobile(whatsapp);
    if (!identity.mobile) {
      throw Object.assign(new Error("WhatsApp number with country code is required."), { statusCode: 400 });
    }
    if (typeof password !== "string" || !password) {
      throw Object.assign(new Error("Password is required."), { statusCode: 400 });
    }
    if (shouldDebugAuthLogin()) {
      console.log("LOGIN EMAIL:", maskEmail(normalizedEmail));
      console.log("LOGIN WHATSAPP:", maskMobile(identity.mobile));
    }
    const loginLookupQuery = `select id, email, password_hash, name, whatsapp, role, email_verified, email_verified_at,
              mobile_verified, mobile_verified_at,
              avatar_url, auth_provider, country_code, country_name, timezone, language_preference,
              account_status, failed_login_count, locked_until
       from public.users
       where lower(email) = $1 and whatsapp = $2`;
    if (shouldDebugAuthLogin()) {
      console.log("LOGIN USER LOOKUP QUERY:", loginLookupQuery);
      console.log("LOGIN USER LOOKUP PARAMS:", [maskEmail(normalizedEmail), maskMobile(identity.mobile)]);
    }
    const result = await this.pool.query(loginLookupQuery, [normalizedEmail, identity.mobile]);
    const user = result.rows[0];
    const userActive = user?.account_status === "active";
    if (shouldDebugAuthLogin()) {
      console.log("USER FOUND:", Boolean(user));
      console.log("USER ID:", user?.id || null);
      console.log("USER EMAIL:", maskEmail(user?.email));
      console.log("USER WHATSAPP:", maskMobile(user?.whatsapp));
      console.log("USER ACTIVE:", user ? userActive : null);
      console.log("USER ACCOUNT STATUS:", user?.account_status || null);
      console.log("PASSWORD HASH EXISTS:", Boolean(user?.password_hash));
    }
    if (user?.account_status && user.account_status !== "active") {
      throw Object.assign(new Error("This account is not active. Contact CODRAI support."), { statusCode: 403 });
    }
    if (user?.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
      throw Object.assign(new Error("This account is temporarily locked after repeated failed attempts."), { statusCode: 423 });
    }

    const passwordValid = Boolean(user?.password_hash) && await bcrypt.compare(password || "", user.password_hash);
    if (shouldDebugAuthLogin()) {
      const passwordMatch = passwordValid;
      console.log("PASSWORD MATCH:", passwordValid);
      console.log("bcrypt.compare result:", passwordMatch);
    }
    if (!user || !passwordValid) {
      if (user) {
        await this.pool.query(
          `update public.users
           set failed_login_count = failed_login_count + 1,
               locked_until = case when failed_login_count + 1 >= 5 then now() + interval '15 minutes' else locked_until end,
               updated_at = now()
           where id = $1`,
          [user.id]
        );
      }
      await this.#recordLogin({
        userId: user?.id || null,
        method: "password",
        success: false,
        ipAddress,
        userAgent,
        deviceFingerprint,
        countryCode: countryCode || user?.country_code,
        failureReason: "invalid_credentials",
      });
      throw Object.assign(new Error("Invalid credentials."), { statusCode: 401 });
    }

    if (env.supabaseAuthRequired && !this.supabaseAuth.configured) {
      throw Object.assign(new Error("Supabase Auth is required but not configured."), {
        statusCode: 503,
        code: "SUPABASE_AUTH_NOT_CONFIGURED",
      });
    }
    let supabaseIdentity = { status: "disabled", user: null, created: false };
    if (this.supabaseAuth.configured) {
      try {
        supabaseIdentity = await this.supabaseAuth.createPasswordUser({
          email: normalizedEmail,
          password,
          phone: user.whatsapp,
          name: user.name,
          emailConfirm: Boolean(user.email_verified || user.email_verified_at),
          phoneConfirm: Boolean(user.mobile_verified || user.mobile_verified_at),
        });
        if (supabaseIdentity.user?.id) {
          await this.pool.query(
            `update public.users
             set supabase_auth_user_id = coalesce(supabase_auth_user_id, $2::uuid),
                 updated_at = now()
             where id = $1`,
            [user.id, supabaseIdentity.user.id]
          );
        }
      } catch (error) {
        if (env.supabaseAuthRequired) throw error;
        console.warn("SUPABASE AUTH LOGIN SYNC DEGRADED", {
          userId: user.id,
          code: error.code || "SUPABASE_AUTH_ERROR",
          message: error.message,
        });
      }
    }

    return this.#issueOtpChallenge({
      purpose: "login",
      authMethod: "password",
      email: user.email,
      whatsapp: user.whatsapp,
      userId: user.id,
      fullName: user.name,
      rememberMe,
      userAgent,
      ipAddress,
      countryCode: identity.countryCode || countryCode || user.country_code,
      countryName: identity.countryName || user.country_name,
      timezone: user.timezone || "UTC",
      languagePreference: user.language_preference || "en",
      metadata: {
        credentialsVerified: true,
        deviceFingerprint: deviceFingerprint || null,
        deviceName: deviceName || null,
        supabaseAuthUserId: supabaseIdentity.user?.id || null,
      },
    });
  }

  async me(userId) {
    this.#assertConfigured();
    const result = await this.pool.query(
      `select u.id, u.supabase_auth_user_id, u.email, u.name, u.whatsapp, u.role, u.email_verified, u.email_verified_at,
              u.mobile_verified, u.mobile_verified_at, u.avatar_url, u.auth_provider,
              u.country_code, u.country_name, u.timezone, u.language_preference, u.kyc_status, u.account_status,
              u.last_login_at, u.last_active_at, u.login_count,
              oi.provider_type, oi.google_id, wm.workspace_id, wm.role as workspace_role
       from public.users u
       left join public.oauth_identities oi on oi.user_id = u.id
       left join public.workspace_members wm on wm.user_id = u.id
       where u.id = $1`,
      [userId]
    );
    const user = result.rows[0];
    if (!user) return null;
    return {
      id: user.id,
      supabaseAuthUserId: user.supabase_auth_user_id || null,
      email: user.email,
      name: user.name,
      whatsapp: user.whatsapp || null,
      role: user.role || "user",
      emailVerified: Boolean(user.email_verified || user.email_verified_at),
      mobileVerified: Boolean(user.mobile_verified || user.mobile_verified_at),
      avatarUrl: user.avatar_url || null,
      authProvider: user.provider_type || user.auth_provider || "password",
      googleId: user.google_id || null,
      countryCode: user.country_code || null,
      country: user.country_name || null,
      timezone: user.timezone || "UTC",
      languagePreference: user.language_preference || "en",
      kycStatus: user.kyc_status || "not_started",
      accountStatus: user.account_status || "active",
      lastLoginAt: user.last_login_at || null,
      lastActiveAt: user.last_active_at || null,
      loginCount: Number(user.login_count || 0),
      workspaceId: user.workspace_id,
      workspaceRole: user.workspace_role,
    };
  }

  async googleLogin({ code, credential, redirectUri, rememberMe = true, userAgent, ipAddress, deviceFingerprint, deviceName, countryCode }) {
    this.#assertConfigured();
    console.info("GOOGLE AUTH START", {
      mode: credential ? "credential" : "code",
      redirectUri: redirectUri || null,
      rememberMe: rememberMe !== false,
    });
    const profile = credential
      ? await this.#verifyGoogleIdToken(credential)
      : await this.#exchangeAndVerifyGoogleCode(code, redirectUri);
    console.log("GOOGLE PROFILE", {
      googleId: profile?.googleId ? `${String(profile.googleId).slice(0, 6)}...` : null,
      email: maskEmail(profile?.email),
      emailVerified: Boolean(profile?.emailVerified),
    });
    if (!profile?.email || !profile.emailVerified) {
      throw Object.assign(new Error("Google account email must be verified."), { statusCode: 403 });
    }

    const normalizedEmail = profile.email.toLowerCase().trim();
    const existing = await this.pool.query(
      `select u.id, u.email, u.name, u.whatsapp, u.role, u.avatar_url,
              u.country_code, u.country_name, u.timezone, u.language_preference
       from public.users u
       left join public.oauth_identities identity
         on identity.user_id = u.id
        and identity.provider_type = 'google'
       where identity.google_id = $1 or lower(u.email) = $2
       order by case when identity.google_id = $1 then 0 else 1 end
       limit 1`,
      [profile.googleId, normalizedEmail]
    );
    const user = existing.rows[0] || null;
    const mobileIdentity = user?.whatsapp ? normalizeGlobalMobile(user.whatsapp) : null;
    console.info("GOOGLE AUTH PROFILE MATCHED", {
      email: maskEmail(normalizedEmail),
      existingUser: Boolean(user),
      userId: user?.id || null,
      hasWhatsapp: Boolean(user?.whatsapp),
    });

    let supabaseIdentity = null;
    if (this.supabaseAuth.configured) {
      try {
        supabaseIdentity = await this.supabaseAuth.createExternalUser({
          email: normalizedEmail,
          name: profile.fullName || normalizedEmail,
          avatarUrl: profile.avatarUrl || null,
          phone: user?.whatsapp || null,
          provider: "google",
        });
      } catch (error) {
        if (env.supabaseAuthRequired) throw error;
        console.warn("SUPABASE AUTH GOOGLE LOGIN DEGRADED", {
          email: maskEmail(normalizedEmail),
          code: error.code || "SUPABASE_AUTH_ERROR",
          message: error.message,
        });
      }
    }

    const client = await this.pool.connect();
    try {
      await client.query("begin");

      let userId = user?.id || supabaseIdentity?.user?.id || randomUUID();
      let workspaceId;
      let role = user?.role || "user";

      if (user) {
        const workspace = await client.query(
          "select workspace_id from public.workspace_members where user_id = $1 order by created_at asc limit 1",
          [user.id]
        );
        workspaceId = workspace.rows[0]?.workspace_id || randomUUID();
        await client.query(
          `update public.users
           set supabase_auth_user_id = coalesce(supabase_auth_user_id, $2::uuid),
               name = coalesce($3, name),
               avatar_url = coalesce($4, avatar_url),
               auth_provider = 'google',
               email_verified = true,
               email_verified_at = coalesce(email_verified_at, now()),
               country_code = coalesce(country_code, $5),
               country_name = coalesce(country_name, $6),
               timezone = coalesce(timezone, $7),
               language_preference = coalesce(language_preference, $8),
               failed_login_count = 0,
               locked_until = null,
               last_login_at = now(),
               last_active_at = now(),
               login_count = coalesce(login_count, 0) + 1,
               updated_at = now()
           where id = $1`,
          [
            user.id,
            supabaseIdentity?.user?.id || null,
            profile.fullName || null,
            profile.avatarUrl || null,
            mobileIdentity?.countryCode || countryCode || user.country_code || null,
            mobileIdentity?.countryName || user.country_name || null,
            user.timezone || "UTC",
            user.language_preference || "en",
          ]
        );
        if (!workspace.rows[0]?.workspace_id) {
          await client.query(
            `insert into public.workspaces (id, name, owner_id, created_at, updated_at)
             values ($1, $2, $3, now(), now())`,
            [workspaceId, `${profile.fullName || normalizedEmail}'s workspace`, user.id]
          );
          await client.query(
            `insert into public.workspace_members (workspace_id, user_id, role, created_at, updated_at)
             values ($1, $2, 'owner', now(), now())`,
            [workspaceId, user.id]
          );
        }
      } else {
        const userCount = await client.query("select count(*)::int as count from public.users");
        role = userCount.rows[0]?.count === 0 ? "admin" : "user";
        workspaceId = randomUUID();
        await client.query(
          `insert into public.users
             (id, supabase_auth_user_id, email, password_hash, name, whatsapp, role, email_verified, email_verified_at,
              mobile_verified, auth_provider, country_code, country_name, timezone, language_preference,
              terms_accepted_at, privacy_accepted_at, last_login_at, last_active_at, login_count, created_at, updated_at)
           values ($1, $2, $3, null, $4, null, $5, true, now(),
                   false, 'google', $6, $7, $8, $9,
                   now(), now(), now(), now(), 1, now(), now())`,
          [
            userId,
            supabaseIdentity?.user?.id || null,
            normalizedEmail,
            profile.fullName || normalizedEmail,
            role,
            countryCode || null,
            null,
            "UTC",
            "en",
          ]
        );
        await client.query(
          `insert into public.workspaces (id, name, owner_id, created_at, updated_at)
           values ($1, $2, $3, now(), now())`,
          [workspaceId, `${profile.fullName || normalizedEmail}'s workspace`, userId]
        );
        await client.query(
          `insert into public.workspace_members (workspace_id, user_id, role, created_at, updated_at)
           values ($1, $2, 'owner', now(), now())`,
          [workspaceId, userId]
        );
      }

      await this.#upsertGoogleIdentity({
        queryable: client,
        userId,
        googleId: profile.googleId,
        email: normalizedEmail,
        fullName: profile.fullName || normalizedEmail,
        avatarUrl: profile.avatarUrl || null,
      });

      const sessionUser = {
        id: userId,
        email: normalizedEmail,
        name: profile.fullName || user?.name || normalizedEmail,
        whatsapp: user?.whatsapp || null,
        role,
        emailVerified: true,
        mobileVerified: Boolean(user?.whatsapp),
        avatarUrl: profile.avatarUrl || user?.avatar_url || null,
        authProvider: "google",
        googleId: profile.googleId,
        countryCode: mobileIdentity?.countryCode || countryCode || user?.country_code || null,
        country: mobileIdentity?.countryName || user?.country_name || null,
        timezone: user?.timezone || "UTC",
        languagePreference: user?.language_preference || "en",
        workspaceId,
      };
      const session = await this.#createSession({
        userId,
        email: normalizedEmail,
        workspaceId,
        rememberMe,
        userAgent,
        ipAddress,
        user: sessionUser,
        queryable: client,
        deviceFingerprint,
        deviceName,
        authMethod: "google",
        countryCode: sessionUser.countryCode,
      });

      await client.query("commit");
      console.info("GOOGLE AUTH SESSION READY", {
        email: maskEmail(normalizedEmail),
        userId,
        workspaceId,
      });
      return session;
    } catch (error) {
      await client.query("rollback").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  async refresh({ refreshToken, userAgent, ipAddress }) {
    this.#assertConfigured();
    if (!refreshToken) throw new Error("Refresh token is required.");
    const refreshHash = createHash("sha256").update(refreshToken).digest("hex");
    const current = await this.pool.query(
      `select id, user_id, expires_at, revoked_at
       from public.refresh_tokens
       where token_hash = $1`,
      [refreshHash]
    );
    const tokenRecord = current.rows[0];
    if (!tokenRecord || tokenRecord.revoked_at || new Date(tokenRecord.expires_at) <= new Date()) {
      throw new Error("Refresh token is expired or revoked.");
    }
    await this.pool.query("update public.refresh_tokens set revoked_at = now() where id = $1", [tokenRecord.id]);
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
      await this.pool.query("update public.user_sessions set revoked_at = now() where id = $1 and user_id = $2", [sessionId, userId]);
    }
    if (refreshToken) {
      const refreshHash = createHash("sha256").update(refreshToken).digest("hex");
      await this.pool.query("update public.refresh_tokens set revoked_at = now() where token_hash = $1", [refreshHash]);
    }
    return { status: "ok" };
  }

  async forgotPassword({ email }) {
    this.#assertConfigured();
    const normalizedEmail = requireValidEmail(email);
    console.info("PASSWORD_RESET_REQUEST_RECEIVED", {
      email: maskEmail(normalizedEmail),
      provider: env.emailProvider,
      resendConfigured: Boolean(env.resendApiKey),
      senderConfigured: Boolean(env.emailFrom),
      publicAppUrlConfigured: Boolean(env.publicAppUrl),
    });
    const user = await this.pool.query("select id, email from public.users where lower(email) = $1", [normalizedEmail]);
    if (!user.rows[0]) {
      console.info("PASSWORD_RESET_USER_NOT_FOUND", {
        email: maskEmail(normalizedEmail),
        response: "ok",
      });
      return { status: "ok" };
    }
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await this.pool.query(
      "update public.password_reset_tokens set used_at = now() where user_id = $1 and used_at is null",
      [user.rows[0].id]
    );
    await this.pool.query(
      `insert into public.password_reset_tokens (id, user_id, token_hash, expires_at, created_at)
       values ($1, $2, $3, now() + interval '1 hour', now())`,
      [randomUUID(), user.rows[0].id, tokenHash]
    );
    const resetUrl = `${env.publicAppUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
    console.info("PASSWORD_RESET_EMAIL_SEND_STARTED", {
      userId: user.rows[0].id,
      email: maskEmail(normalizedEmail),
      provider: "resend",
      resetUrlHost: (() => {
        try {
          return new URL(resetUrl).host;
        } catch {
          return "invalid-url";
        }
      })(),
    });
    const delivery = await sendEmail({
      to: normalizedEmail,
      subject: "Reset your CODRAI password",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          <h1>Reset your CODRAI password</h1>
          <p>Use the secure link below to choose a new password.</p>
          <p><a href="${resetUrl}">Reset password</a></p>
          <p>This link expires in one hour and can be used only once.</p>
          <p>If you did not request this reset, you can safely ignore this email.</p>
        </div>
      `,
    });
    console.info("PASSWORD_RESET_EMAIL_SEND_RESULT", {
      userId: user.rows[0].id,
      email: maskEmail(normalizedEmail),
      provider: delivery.provider,
      delivered: delivery.delivered,
      messageId: delivery.messageId || null,
    });
    return {
      status: "ok",
      ...(env.nodeEnv !== "production" ? { resetToken: token } : {}),
    };
  }

  async resetPassword({ token, password }) {
    this.#assertConfigured();
    if (!token || !password) throw new Error("Reset token and password are required.");
    if (password.length < 8) throw new Error("Password must be at least 8 characters.");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const result = await this.pool.query(
      `select id, user_id from public.password_reset_tokens
       where token_hash = $1 and used_at is null and expires_at > now()
       order by created_at desc limit 1`,
      [tokenHash]
    );
    const reset = result.rows[0];
    if (!reset) throw new Error("Reset token is invalid or expired.");
    const passwordHash = await bcrypt.hash(password, 12);
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await client.query("update public.users set password_hash = $1, updated_at = now() where id = $2", [passwordHash, reset.user_id]);
      await client.query("update public.password_reset_tokens set used_at = now() where id = $1", [reset.id]);
      await client.query("update public.user_sessions set revoked_at = now() where user_id = $1 and revoked_at is null", [reset.user_id]);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
    const linkedIdentity = await this.pool.query(
      "select supabase_auth_user_id from public.users where id = $1",
      [reset.user_id]
    );
    if (linkedIdentity.rows[0]?.supabase_auth_user_id) {
      await this.supabaseAuth.updatePassword(linkedIdentity.rows[0].supabase_auth_user_id, password).catch((error) => {
        if (env.supabaseAuthRequired) throw error;
        console.warn("SUPABASE AUTH PASSWORD RESET DEGRADED", {
          userId: reset.user_id,
          code: error.code || "SUPABASE_AUTH_ERROR",
          message: error.message,
        });
      });
    }
    return { status: "ok" };
  }

  async verifyEmail({ token }) {
    this.#assertConfigured();
    const tokenHash = createHash("sha256").update(token || "").digest("hex");
    const result = await this.pool.query(
      `select id, user_id from public.email_verification_tokens
       where token_hash = $1 and used_at is null and expires_at > now()
       order by created_at desc limit 1`,
      [tokenHash]
    );
    const verification = result.rows[0];
    if (!verification) throw new Error("Verification token is invalid or expired.");
    const client = await this.pool.connect();
    try {
      await client.query("begin");
      await client.query("update public.users set email_verified = true, email_verified_at = now(), updated_at = now() where id = $1", [verification.user_id]);
      await client.query("update public.email_verification_tokens set used_at = now() where id = $1", [verification.id]);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
    const linkedIdentity = await this.pool.query(
      "select supabase_auth_user_id from public.users where id = $1",
      [verification.user_id]
    );
    if (linkedIdentity.rows[0]?.supabase_auth_user_id) {
      await this.supabaseAuth.confirmEmail(linkedIdentity.rows[0].supabase_auth_user_id).catch((error) => {
        if (env.supabaseAuthRequired) throw error;
        console.warn("SUPABASE AUTH EMAIL CONFIRMATION DEGRADED", {
          userId: verification.user_id,
          code: error.code || "SUPABASE_AUTH_ERROR",
          message: error.message,
        });
      });
    }
    return { status: "ok" };
  }

  async #upsertGoogleIdentity({ queryable, userId, googleId, email, fullName, avatarUrl }) {
    if (!googleId || !email) return;
    await this.#nonCriticalTransactionalWrite({
      queryable,
      savepoint: "codrai_google_identity_write",
      label: "CODRAI Google identity write failed",
      write: async () => {
        const updated = await queryable.query(
          `update public.oauth_identities
           set user_id = $2,
               email = $3,
               full_name = $4,
               avatar_url = $5,
               last_login_at = now(),
               updated_at = now()
           where provider_type = 'google' and google_id = $1
           returning id`,
          [googleId, userId, email, fullName || null, avatarUrl || null]
        );
        if (updated.rows[0]) return;
        await queryable.query(
          `insert into public.oauth_identities
             (id, user_id, provider_type, google_id, email, full_name, avatar_url, last_login_at, created_at, updated_at)
           select $1, $2, 'google', $3, $4, $5, $6, now(), now(), now()
           where not exists (
             select 1 from public.oauth_identities
             where provider_type = 'google' and google_id = $3
           )`,
          [randomUUID(), userId, googleId, email, fullName || null, avatarUrl || null]
        );
      },
    });
  }

  async #createSession({
    userId, email, workspaceId, rememberMe, userAgent, ipAddress, user, queryable = this.pool,
    deviceFingerprint = null, deviceName = null, authMethod = null, countryCode = null,
  }) {
    const tokenId = randomUUID();
    const expiresIn = rememberMe ? "30d" : (process.env.JWT_EXPIRES_IN || "7d");
    const token = jwt.sign({ sub: userId, email, workspaceId, sid: tokenId, role: user?.role || "user" }, env.jwtSecret || process.env.JWT_SECRET || "dev-secret", { expiresIn });
    console.log("JWT GENERATED", { userId, workspaceId, sessionId: tokenId, expiresIn });
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + (rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000);
    const refreshToken = randomBytes(48).toString("hex");
    const refreshTokenHash = createHash("sha256").update(refreshToken).digest("hex");
    const refreshExpiresAt = new Date(Date.now() + (rememberMe ? 45 : 14) * 24 * 60 * 60 * 1000);

    await queryable.query(
      `insert into public.user_sessions
         (id, user_id, token_hash, user_agent, ip_address, device_fingerprint, device_name, last_seen_at, expires_at, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, now(), $8, now())`,
      [tokenId, userId, tokenHash, userAgent || null, ipAddress || null, deviceFingerprint || null, deviceName || null, expiresAt]
    );
    await queryable.query(
      `insert into public.refresh_tokens (id, user_id, token_hash, expires_at, created_at)
       values ($1, $2, $3, $4, now())`,
      [randomUUID(), userId, refreshTokenHash, refreshExpiresAt]
    );
    await this.#recordLogin({
      userId,
      sessionId: tokenId,
      method: authMethod || user?.authProvider || "password",
      success: true,
      ipAddress,
      userAgent,
      deviceFingerprint,
      countryCode: countryCode || user?.countryCode,
      queryable,
    });

    return {
      token,
      refreshToken,
      user: user || { id: userId, email, role: "user" },
      workspaceId,
      expiresAt: expiresAt.toISOString(),
      refreshExpiresAt: refreshExpiresAt.toISOString(),
    };
  }

  async #exchangeAndVerifyGoogleCode(code, requestedRedirectUri) {
    if (!code) throw Object.assign(new Error("Google authorization code is required."), { statusCode: 400 });
    const config = await new GoogleOAuthConfigService({ pool: this.pool }).resolve({ includeSecret: true });
    if (!config.clientId || !config.clientSecret) {
      throw Object.assign(new Error("Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."), { statusCode: 503 });
    }
    const redirectUri = this.#resolveGoogleRedirectUri(config, requestedRedirectUri);
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const token = await response.json().catch(() => ({}));
    if (!response.ok || !token.id_token) {
      throw Object.assign(new Error(token.error_description || token.error || "Google OAuth token exchange failed."), { statusCode: 401 });
    }
    return this.#verifyGoogleIdToken(token.id_token);
  }

  #resolveGoogleRedirectUri(config, requestedRedirectUri) {
    const redirectUri = String(requestedRedirectUri || config.redirectUri || "postmessage").trim();
    const allowed = new Set([
      "postmessage",
      config.redirectUri,
      config.authorizedRedirect,
    ].filter(Boolean).map((value) => String(value).trim()));

    if (!allowed.has(redirectUri)) {
      throw Object.assign(new Error("Google OAuth redirect URI is not authorized for this CODRAI instance."), { statusCode: 400 });
    }
    return redirectUri;
  }

  async #verifyGoogleIdToken(idToken) {
    if (!idToken) throw Object.assign(new Error("Google identity token is required."), { statusCode: 400 });
    const config = await new GoogleOAuthConfigService({ pool: this.pool }).resolve({ includeSecret: false });
    if (!config.clientId) {
      throw Object.assign(new Error("Google OAuth is not configured. Set GOOGLE_CLIENT_ID."), { statusCode: 503 });
    }
    const url = new URL("https://oauth2.googleapis.com/tokeninfo");
    url.searchParams.set("id_token", idToken);
    const response = await fetch(url);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw Object.assign(new Error(payload.error_description || payload.error || "Google identity token validation failed."), { statusCode: 401 });
    }
    if (payload.aud !== config.clientId) {
      throw Object.assign(new Error("Google identity token audience mismatch."), { statusCode: 401 });
    }
    if (!["accounts.google.com", "https://accounts.google.com"].includes(payload.iss)) {
      throw Object.assign(new Error("Google identity token issuer is invalid."), { statusCode: 401 });
    }
    if (Number(payload.exp || 0) * 1000 <= Date.now()) {
      throw Object.assign(new Error("Google identity token has expired."), { statusCode: 401 });
    }
    return {
      googleId: payload.sub,
      email: payload.email,
      emailVerified: payload.email_verified === "true" || payload.email_verified === true,
      fullName: payload.name || [payload.given_name, payload.family_name].filter(Boolean).join(" ") || payload.email,
      avatarUrl: payload.picture || null,
    };
  }

  #assertConfigured() {
    if (!this.pool) throw new Error("Authentication requires PostgreSQL DATABASE_URL.");
  }

  async #audit({ workspaceId = null, userId = null, action, targetId, metadata = {}, queryable = this.pool }) {
    const write = () => queryable.query(
      `insert into public.auth_security_events
         (id, workspace_id, user_id, action, target_id, metadata, created_at)
       values ($1, $2, $3, $4, $5, $6::jsonb, now())`,
      [randomUUID(), workspaceId, userId, action, targetId || null, JSON.stringify(metadata)]
    );
    if (queryable !== this.pool) {
      await this.#nonCriticalTransactionalWrite({
        queryable,
        savepoint: "codrai_auth_audit_write",
        write,
        label: "CODRAI auth audit write failed",
      });
      return;
    }
    try {
      await write();
    } catch (error) {
      console.warn("CODRAI auth audit write failed:", error.message);
    }
  }

  async securityOverview(userId) {
    this.#assertConfigured();
    const [sessions, history] = await Promise.all([
      this.pool.query(
        `select id, device_name, user_agent, ip_address, last_seen_at, created_at, expires_at
         from public.user_sessions
         where user_id = $1 and revoked_at is null and expires_at > now()
         order by last_seen_at desc`,
        [userId]
      ),
      this.pool.query(
        `select method, success, ip_address, user_agent, country_code, failure_reason, created_at
         from public.login_history
         where user_id = $1
         order by created_at desc
         limit 20`,
        [userId]
      ),
    ]);
    return { activeSessions: sessions.rows, loginHistory: history.rows };
  }

  async revokeSession({ userId, sessionId }) {
    this.#assertConfigured();
    const result = await this.pool.query(
      `update public.user_sessions
       set revoked_at = now()
       where id = $1 and user_id = $2 and revoked_at is null
       returning id`,
      [sessionId, userId]
    );
    return { revoked: Boolean(result.rows[0]) };
  }

  async #recordLogin({
    userId = null, sessionId = null, method, success, ipAddress, userAgent,
    deviceFingerprint, countryCode, failureReason = null, queryable = this.pool,
  }) {
    const write = () => queryable.query(
      `insert into public.login_history
         (id, user_id, session_id, method, success, ip_address, user_agent,
          device_fingerprint, country_code, failure_reason, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())`,
      [randomUUID(), userId, sessionId, method, success, ipAddress || null, userAgent || null, deviceFingerprint || null, countryCode || null, failureReason]
    );
    if (queryable !== this.pool) {
      await this.#nonCriticalTransactionalWrite({
        queryable,
        savepoint: "codrai_login_history_write",
        write,
        label: "CODRAI login history write failed",
      });
      return;
    }
    try {
      await write();
    } catch (error) {
      console.warn("CODRAI login history write failed:", error.message);
    }
  }

  async #safeTelemetryQuery({ queryable = this.pool, sql, params = [], label, fallback = null }) {
    if (queryable !== this.pool) {
      const savepoint = `codrai_optional_auth_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
      try {
        await queryable.query(`savepoint ${savepoint}`);
        const result = await queryable.query(sql, params);
        await queryable.query(`release savepoint ${savepoint}`);
        return result;
      } catch (error) {
        try {
          await queryable.query(`rollback to savepoint ${savepoint}`);
          await queryable.query(`release savepoint ${savepoint}`);
        } catch (rollbackError) {
          console.warn(`${label || "CODRAI optional auth telemetry query failed"}; savepoint cleanup failed:`, rollbackError.message);
        }
        console.warn(`${label || "CODRAI optional auth telemetry query failed"}:`, error.message);
        return fallback;
      }
    }
    try {
      return await queryable.query(sql, params);
    } catch (error) {
      console.warn(`${label || "CODRAI optional auth telemetry query failed"}:`, error.message);
      return fallback;
    }
  }

  async #nonCriticalTransactionalWrite({ queryable, savepoint, write, label }) {
    try {
      await queryable.query(`savepoint ${savepoint}`);
      await write();
      await queryable.query(`release savepoint ${savepoint}`);
    } catch (error) {
      try {
        await queryable.query(`rollback to savepoint ${savepoint}`);
        await queryable.query(`release savepoint ${savepoint}`);
      } catch (rollbackError) {
        console.warn(`${label}; savepoint cleanup failed:`, rollbackError.message);
      }
      console.warn(`${label}:`, error.message);
    }
  }
}
