import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { sendEmail } from "../services/email.service.js";
import { SmsService } from "../services/sms.service.js";

const router = Router();

function debugAllowed() {
  return env.nodeEnv !== "production" || env.debugAuthEndpoints;
}

function requireDebugEnabled(req, res, next) {
  if (debugAllowed()) return next();
  return res.status(403).json({
    status: "disabled",
    message: "Debug endpoints are disabled. Set DEBUG_AUTH_ENDPOINTS=true temporarily to enable them.",
  });
}

function maskEmail(email) {
  const [local = "", domain = ""] = String(email || "").split("@");
  return domain ? `${local.slice(0, 2)}***@${domain}` : null;
}

function maskMobile(mobile) {
  const value = String(mobile || "");
  return value.length > 6 ? `${value.slice(0, 3)}******${value.slice(-3)}` : null;
}

function providerConfig() {
  return {
    email: {
      provider: env.emailProvider,
      resend: Boolean(env.resendApiKey && env.emailFrom),
      sendgrid: Boolean(env.sendgridApiKey && env.emailFrom),
      smtp: Boolean(env.smtpHost && env.smtpPort && env.smtpUser && env.smtpPassword && (env.smtpFrom || env.emailFrom)),
      fromConfigured: Boolean(env.emailFrom || env.smtpFrom),
    },
    whatsapp: {
      provider: env.smsProvider,
      twilio: Boolean(env.twilioAccountSid && env.twilioAuthToken && env.twilioPhoneNumber),
      twilioVerify: Boolean(env.twilioAccountSid && env.twilioAuthToken && env.twilioVerifyServiceSid),
      msg91: Boolean(env.msg91AuthKey && env.msg91TemplateId),
      senderConfigured: Boolean(env.twilioPhoneNumber),
    },
    jwt: Boolean(env.jwtSecret),
    otp: Boolean(env.otpSecret && env.otpExpiryMinutes),
    supabase: Boolean(env.supabaseUrl && env.supabaseServiceRoleKey),
  };
}

router.get("/auth-health", async (req, res) => {
  const config = providerConfig();
  let database = false;
  try {
    if (req.app.locals.pool) {
      await req.app.locals.pool.query("select 1");
      database = true;
    }
  } catch (error) {
    console.error("DEBUG AUTH HEALTH DATABASE FAILED", {
      code: error.code || "DATABASE_HEALTH_FAILED",
      message: error.message,
    });
  }

  return res.status(200).json({
    database,
    supabase: config.supabase,
    smtp: config.email.smtp,
    email: config.email.resend || config.email.sendgrid || config.email.smtp,
    whatsapp: config.whatsapp.twilio || config.whatsapp.msg91,
    jwt: config.jwt,
    otp: config.otp,
    providers: config,
  });
});

router.get("/system", async (req, res) => {
  const config = providerConfig();
  const checks = {
    database: false,
    email: config.email.resend || config.email.sendgrid || config.email.smtp,
    jwt: config.jwt,
    otp: config.otp,
    whatsapp: config.whatsapp.twilio || config.whatsapp.twilioVerify || config.whatsapp.msg91,
    sms: config.whatsapp.twilio || config.whatsapp.twilioVerify || config.whatsapp.msg91,
    storage: false,
    redis: false,
    worker: false,
  };

  try {
    if (req.app.locals.pool) {
      await req.app.locals.pool.query("select 1");
      checks.database = true;
    }
  } catch (error) {
    console.error("DEBUG SYSTEM DATABASE FAILED", {
      code: error.code || "DATABASE_HEALTH_FAILED",
      message: error.message,
    });
  }

  try {
    if (req.app.locals.redis) {
      await req.app.locals.redis.ping();
      checks.redis = true;
    }
  } catch (error) {
    console.error("DEBUG SYSTEM REDIS FAILED", {
      code: error.code || "REDIS_HEALTH_FAILED",
      message: error.message,
    });
  }

  try {
    const distCandidates = [
      path.resolve(process.cwd(), "dist"),
      path.resolve(process.cwd(), "backend", "dist"),
    ];
    checks.storage = distCandidates.some((candidate) => fs.existsSync(path.join(candidate, "index.html")));
  } catch {
    checks.storage = false;
  }

  try {
    if (req.app.locals.pool) {
      const recentWorkerEvents = await req.app.locals.pool.query(
        `select count(*)::int as events
         from public.auth_otp_delivery_events
         where created_at > now() - interval '24 hours'`
      );
      checks.worker = env.otpDeliveryMode !== "queue" || checks.redis || Number(recentWorkerEvents.rows[0]?.events || 0) > 0;
    }
  } catch {
    checks.worker = env.otpDeliveryMode !== "queue" || checks.redis;
  }

  const degraded = [];
  if (!checks.whatsapp) degraded.push("WhatsApp/SMS provider not configured; email-only OTP fallback is active.");
  if (!config.supabase) degraded.push("Supabase service credentials are not configured in this runtime.");

  return res.status(200).json({
    status: checks.database && checks.email && checks.jwt && checks.otp ? "ok" : "degraded",
    checks,
    providers: config,
    degraded,
    timestamp: new Date().toISOString(),
  });
});

router.get("/email", requireDebugEnabled, async (req, res) => {
  const to = String(req.query.to || env.debugEmailTo || "").trim();
  if (!to) {
    return res.status(400).json({
      status: "failed",
      message: "Provide ?to=email@example.com or set DEBUG_EMAIL_TO.",
    });
  }
  console.info("DEBUG EMAIL SEND STARTED", { to: maskEmail(to), provider: env.emailProvider });
  try {
    const result = await sendEmail({
      to,
      subject: "CODRAI debug email",
      html: "<p>CODRAI debug email delivery is working.</p>",
    });
    console.info("DEBUG EMAIL SEND RESULT", {
      to: maskEmail(to),
      provider: result.provider,
      delivered: result.delivered,
      messageId: result.messageId || null,
    });
    return res.status(200).json({
      status: "ok",
      delivered: result.delivered,
      provider: result.provider,
      messageId: result.messageId || null,
    });
  } catch (error) {
    console.error("DEBUG EMAIL SEND FAILED", {
      to: maskEmail(to),
      code: error.code || error.name || "EMAIL_DEBUG_FAILED",
      message: error.message,
    });
    return res.status(error.statusCode || 502).json({
      status: "failed",
      code: error.code || error.name || "EMAIL_DEBUG_FAILED",
      message: error.message,
    });
  }
});

router.get("/whatsapp", requireDebugEnabled, async (req, res) => {
  const to = String(req.query.to || env.debugWhatsappTo || "").trim();
  if (!to) {
    return res.status(400).json({
      status: "failed",
      message: "Provide ?to=+15551234567 or set DEBUG_WHATSAPP_TO.",
    });
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  console.info("DEBUG WHATSAPP SEND STARTED", { to: maskMobile(to), provider: env.smsProvider });
  try {
    const result = await new SmsService().sendOtp({
      mobile: to,
      code,
      purpose: "signup",
      expiresInMinutes: env.otpExpiryMinutes,
      provider: env.smsProvider,
    });
    console.info("DEBUG WHATSAPP SEND RESULT", {
      to: maskMobile(to),
      provider: result.provider,
      delivered: result.delivered,
      messageId: result.messageId || null,
    });
    return res.status(200).json({
      status: "ok",
      delivered: result.delivered,
      provider: result.provider,
      messageId: result.messageId || null,
    });
  } catch (error) {
    console.error("DEBUG WHATSAPP SEND FAILED", {
      to: maskMobile(to),
      code: error.code || error.name || "WHATSAPP_DEBUG_FAILED",
      message: error.message,
    });
    return res.status(error.statusCode || 502).json({
      status: "failed",
      code: error.code || error.name || "WHATSAPP_DEBUG_FAILED",
      message: error.message,
    });
  }
});

router.get("/jwt", (_req, res) => {
  if (!env.jwtSecret) return res.status(503).json({ status: "failed", jwt: false });
  const token = jwt.sign({ sub: "debug", scope: "auth-health" }, env.jwtSecret, { expiresIn: "60s" });
  return res.status(200).json({ status: "ok", jwt: true, tokenIssued: Boolean(token) });
});

export default router;
