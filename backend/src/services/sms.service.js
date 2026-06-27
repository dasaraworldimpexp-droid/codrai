import { env } from "../config/env.js";

export class SmsService {
  async sendOtp({ mobile, code, purpose, expiresInMinutes, provider }) {
    const action = purpose === "signup" ? "verify your account" : "sign in";
    const body = `Your CODRAI code is ${code}. Use it to ${action}. It expires in ${expiresInMinutes} minutes. Do not share this code.`;

    const selectedProvider = provider || env.smsProvider;

    if (selectedProvider === "twilio") {
      if (!env.twilioAccountSid || !env.twilioAuthToken || !env.twilioPhoneNumber) {
        console.error("TWILIO OTP CONFIG MISSING", {
          hasAccountSid: Boolean(env.twilioAccountSid),
          hasAuthToken: Boolean(env.twilioAuthToken),
          hasSender: Boolean(env.twilioPhoneNumber),
        });
        throw Object.assign(new Error("SMS OTP delivery is not configured."), { statusCode: 503, provider: "twilio" });
      }

      const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(env.twilioAccountSid)}/Messages.json`;
      const credentials = Buffer.from(`${env.twilioAccountSid}:${env.twilioAuthToken}`).toString("base64");
      const usingWhatsapp = Boolean(env.twilioWhatsappNumber);
      const toAddress = usingWhatsapp && !String(mobile).startsWith("whatsapp:")
        ? `whatsapp:${mobile}`
        : mobile;
      const fromAddress = usingWhatsapp && !String(env.twilioPhoneNumber).startsWith("whatsapp:")
        ? `whatsapp:${env.twilioPhoneNumber}`
        : env.twilioPhoneNumber;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: toAddress,
          From: fromAddress,
          Body: body,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error("TWILIO OTP DELIVERY FAILED", {
          status: response.status,
          code: payload.code || null,
          message: payload.message || "SMS provider rejected OTP delivery.",
        });
        throw Object.assign(new Error(payload.message || "SMS provider rejected OTP delivery."), {
          statusCode: 502,
          provider: "twilio",
        });
      }
      console.info("TWILIO OTP DELIVERED", {
        to: `${String(mobile).slice(0, 3)}******${String(mobile).slice(-3)}`,
        channel: usingWhatsapp ? "whatsapp" : "sms",
        messageId: payload.sid || null,
      });
      return { delivered: true, provider: usingWhatsapp ? "twilio_whatsapp" : "twilio", messageId: payload.sid || null };
    }

    if (selectedProvider === "msg91") {
      if (!env.msg91AuthKey || !env.msg91TemplateId) {
        console.error("MSG91 OTP CONFIG MISSING", {
          hasAuthKey: Boolean(env.msg91AuthKey),
          hasTemplateId: Boolean(env.msg91TemplateId),
        });
        throw Object.assign(new Error("MSG91 SMS delivery is not configured."), { statusCode: 503, provider: "msg91" });
      }
      const response = await fetch("https://control.msg91.com/api/v5/flow", {
        method: "POST",
        headers: {
          authkey: env.msg91AuthKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_id: env.msg91TemplateId,
          short_url: "0",
          recipients: [{ mobiles: mobile.replace(/^\+/, ""), otp: code }],
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.type === "error") {
        console.error("MSG91 OTP DELIVERY FAILED", {
          status: response.status,
          message: payload.message || "MSG91 rejected OTP delivery.",
        });
        throw Object.assign(new Error(payload.message || "MSG91 rejected OTP delivery."), { statusCode: 502, provider: "msg91" });
      }
      console.info("MSG91 OTP DELIVERED", {
        to: `${String(mobile).slice(0, 3)}******${String(mobile).slice(-3)}`,
        messageId: payload.request_id || null,
      });
      return { delivered: true, provider: "msg91", messageId: payload.request_id || null };
    }

    if (env.nodeEnv !== "production" && selectedProvider === "console") {
      console.info("CODRAI SMS OTP", { mobile, code, purpose, expiresInMinutes });
      return { delivered: true, provider: "console", developmentCode: code };
    }

    throw Object.assign(new Error(`SMS OTP provider '${selectedProvider}' is unavailable.`), {
      statusCode: 503,
      provider: selectedProvider || "unconfigured",
    });
  }
}
