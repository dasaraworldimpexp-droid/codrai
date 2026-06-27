import { Queue, QueueEvents } from "bullmq";
import { env } from "../config/env.js";
import { QUEUE_NAMES } from "../core/queues/queue-names.js";
import { EmailService } from "./email.service.js";
import { SmsService } from "./sms.service.js";
import { decryptOtpPayload, encryptOtpPayload } from "./otp-crypto.js";

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function emailProviders() {
  if (env.nodeEnv !== "production" && env.emailProvider === "console") return ["console"];
  return unique([env.emailProvider, "resend", "sendgrid"]);
}

function smsProviders(countryCode) {
  if (env.nodeEnv !== "production" && env.smsProvider === "console") return ["console"];
  return countryCode === "IN"
    ? unique(["msg91", "twilio", env.smsProvider])
    : unique(["twilio", "msg91", env.smsProvider]);
}

async function deliverWithFailover(providers, send) {
  const attempts = [];
  for (const provider of providers) {
    try {
      const result = await send(provider);
      attempts.push({ provider, status: "sent", messageId: result.messageId || null });
      return { ...result, attempts };
    } catch (error) {
      attempts.push({ provider, status: "failed", error: String(error.message || "Delivery failed").slice(0, 500) });
    }
  }
  const failure = Object.assign(new Error(attempts.at(-1)?.error || "All delivery providers failed."), {
    statusCode: 502,
    attempts,
  });
  throw failure;
}

export async function deliverOtpDirect(payload) {
  const tasks = [
    deliverWithFailover(emailProviders(), (provider) => new EmailService().sendOtp({ ...payload, provider })),
  ];
  if (payload.mobile) {
    tasks.push(deliverWithFailover(
      smsProviders(payload.countryCode),
      (provider) => new SmsService().sendOtp({ ...payload, provider }),
    ));
  }
  const [email, sms] = await Promise.allSettled(tasks);
  const emailResult = email.status === "fulfilled"
    ? email.value
    : { delivered: false, attempts: email.reason?.attempts || [], error: email.reason?.message };
  const smsResult = payload.mobile
    ? (sms?.status === "fulfilled"
      ? sms.value
      : { delivered: false, attempts: sms?.reason?.attempts || [], error: sms?.reason?.message })
    : null;

  return {
    email: emailResult,
    sms: smsResult,
    delivered: Boolean(emailResult.delivered),
    verificationMethod: smsResult?.delivered ? "email_whatsapp" : "email",
    optionalSmsDelivered: payload.mobile ? Boolean(smsResult?.delivered) : null,
    developmentCode: [email, sms]
      .filter(Boolean)
      .find((result) => result.status === "fulfilled" && result.value.developmentCode)?.value.developmentCode,
  };
}

export class OtpDeliveryService {
  constructor({ redis }) {
    this.redis = redis;
  }

  async deliver(payload) {
    if (env.otpDeliveryMode !== "queue" || !this.redis) {
      return deliverOtpDirect(payload);
    }

    const queue = new Queue(QUEUE_NAMES.AUTH_OTP_DELIVERY, { connection: this.redis });
    const events = new QueueEvents(QUEUE_NAMES.AUTH_OTP_DELIVERY, { connection: this.redis.duplicate() });
    await events.waitUntilReady();
    try {
      const job = await queue.add("dual-otp", {
        jobId: payload.challengeId,
        payload: {
          encryptedPayload: encryptOtpPayload(payload),
        },
      }, {
        jobId: `otp-${payload.challengeId}`,
        attempts: 1,
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 1000 },
      });
      return await job.waitUntilFinished(events, 25_000);
    } catch (error) {
      if (process.env.OTP_QUEUE_DIRECT_FALLBACK === "false") throw error;
      console.warn(`OTP queue unavailable; using direct provider delivery: ${error.message}`);
      return deliverOtpDirect(payload);
    } finally {
      await Promise.allSettled([queue.close(), events.close()]);
    }
  }
}

export function handleOtpDeliveryJob({ encryptedPayload }) {
  return deliverOtpDirect(decryptOtpPayload(encryptedPayload));
}
