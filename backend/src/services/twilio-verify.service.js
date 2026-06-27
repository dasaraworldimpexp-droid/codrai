import twilio from "twilio";
import { env } from "../config/env.js";

function assertTwilioVerifyConfigured() {
  if (!env.twilioAccountSid || !env.twilioAuthToken || !env.twilioVerifyServiceSid) {
    throw Object.assign(new Error("Twilio Verify is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID."), {
      statusCode: 503,
      code: "TWILIO_VERIFY_NOT_CONFIGURED",
    });
  }
}

function twilioError(error) {
  const message = error?.message || "Twilio Verify request failed.";
  return Object.assign(new Error(message), {
    statusCode: Number(error?.status) >= 500 ? 502 : 400,
    code: error?.code || "TWILIO_VERIFY_FAILED",
    twilioStatus: error?.status || null,
    twilioPayload: {
      code: error?.code || null,
      message,
      moreInfo: error?.moreInfo || error?.more_info || null,
      status: error?.status || null,
      details: error?.details || null,
      raw: error,
    },
  });
}

export class TwilioVerifyService {
  #client;

  get client() {
    assertTwilioVerifyConfigured();
    if (!this.#client) {
      this.#client = twilio(env.twilioAccountSid, env.twilioAuthToken);
    }
    return this.#client;
  }

  async sendOtp({ phone }) {
    try {
      const verification = await this.client.verify.v2
        .services(env.twilioVerifyServiceSid)
        .verifications
        .create({
          to: phone,
          channel: "sms",
        });
      return {
        success: true,
        sid: verification.sid || null,
        status: verification.status || "pending",
        channel: verification.channel || "sms",
        to: verification.to || phone,
        valid: Boolean(verification.valid),
      };
    } catch (error) {
      throw twilioError(error);
    }
  }

  async verifyOtp({ phone, otp }) {
    try {
      const verificationCheck = await this.client.verify.v2
        .services(env.twilioVerifyServiceSid)
        .verificationChecks
        .create({
          to: phone,
          code: otp,
        });
      return {
        success: true,
        sid: verificationCheck.sid || null,
        status: verificationCheck.status || "pending",
        approved: verificationCheck.status === "approved",
        valid: Boolean(verificationCheck.valid),
        to: verificationCheck.to || phone,
      };
    } catch (error) {
      throw twilioError(error);
    }
  }
}
