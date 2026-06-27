import { Resend } from "resend";
import { env } from "../config/env.js";

let resendClient;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeRecipients(to) {
  const recipients = (Array.isArray(to) ? to : [to])
    .map((recipient) => String(recipient || "").trim())
    .filter(Boolean);

  if (!recipients.length) {
    throw Object.assign(new Error("At least one email recipient is required."), {
      code: "EMAIL_RECIPIENT_REQUIRED",
      statusCode: 400,
    });
  }

  return recipients;
}

function maskEmail(email) {
  const [local = "", domain = ""] = String(email).split("@");
  if (!domain) return "invalid-recipient";
  return `${local.slice(0, 2)}***@${domain}`;
}

function getResendClient() {
  const apiKey = env.resendApiKey || process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error("Resend email delivery is not configured."), {
      code: "RESEND_NOT_CONFIGURED",
      statusCode: 503,
    });
  }

  if (!resendClient) resendClient = new Resend(apiKey);
  return resendClient;
}

export async function sendEmail({ to, subject, html }) {
  const recipients = normalizeRecipients(to);
  const normalizedSubject = String(subject || "").trim();
  const normalizedHtml = String(html || "").trim();
  const from = env.emailFrom || process.env.RESEND_FROM_EMAIL || process.env.EMAIL_FROM;

  if (!from) {
    throw Object.assign(new Error("Sender email is not configured."), {
      code: "RESEND_FROM_EMAIL_NOT_CONFIGURED",
      statusCode: 503,
    });
  }
  if (!normalizedSubject) {
    throw Object.assign(new Error("Email subject is required."), {
      code: "EMAIL_SUBJECT_REQUIRED",
      statusCode: 400,
    });
  }
  if (!normalizedHtml) {
    throw Object.assign(new Error("Email HTML content is required."), {
      code: "EMAIL_HTML_REQUIRED",
      statusCode: 400,
    });
  }

  try {
    const { data, error } = await getResendClient().emails.send({
      from,
      to: recipients,
      subject: normalizedSubject,
      html: normalizedHtml,
    });

    if (error) {
      throw Object.assign(new Error(error.message || "Resend rejected email delivery."), {
        code: error.name || "RESEND_DELIVERY_REJECTED",
        statusCode: Number(error.statusCode) || 502,
      });
    }

    console.info("Email delivered", {
      provider: "resend",
      messageId: data?.id || null,
      recipients: recipients.map(maskEmail),
    });

    return {
      delivered: true,
      provider: "resend",
      messageId: data?.id || null,
    };
  } catch (error) {
    console.error("Email delivery failed", {
      provider: "resend",
      code: error.code || error.name || "RESEND_DELIVERY_FAILED",
      message: error.message,
      recipients: recipients.map(maskEmail),
    });

    if (error.statusCode) throw error;
    throw Object.assign(new Error("Resend email delivery failed."), {
      cause: error,
      code: "RESEND_DELIVERY_FAILED",
      statusCode: 502,
    });
  }
}

export class EmailService {
  async sendOtp({ email, code, purpose, expiresInMinutes, provider }) {
    const subject = purpose === "signup"
      ? "Verify your CODRAI account"
      : "Your CODRAI sign-in code";
    const action = purpose === "signup" ? "complete your account" : "sign in";
    const html = `
      <div style="background:#0b0f19;padding:32px;font-family:Inter,Arial,sans-serif;color:#fff">
        <div style="max-width:520px;margin:0 auto;border:1px solid #263044;background:#111827;padding:32px;border-radius:16px">
          <p style="margin:0 0 8px;color:#67e8f9;font-weight:700">CODRAI AI</p>
          <h1 style="margin:0 0 16px;font-size:24px">Your verification code</h1>
          <p style="color:#cbd5e1;line-height:1.6">Use this code to ${action}. It expires in ${expiresInMinutes} minutes.</p>
          <div style="margin:28px 0;padding:18px;text-align:center;background:#0b1220;border:1px solid #4f46e5;border-radius:12px;font-size:34px;font-weight:800;letter-spacing:10px">${escapeHtml(code)}</div>
          <p style="margin:0;color:#94a3b8;font-size:13px">If you did not request this code, you can safely ignore this email.</p>
        </div>
      </div>
    `;

    const selectedProvider = provider || env.emailProvider;

    if (selectedProvider === "resend") {
      return sendEmail({ to: email, subject, html });
    }

    if (selectedProvider === "sendgrid") {
      if (!env.sendgridApiKey || !env.emailFrom) {
        throw Object.assign(new Error("SendGrid email delivery is not configured."), { statusCode: 503, provider: "sendgrid" });
      }
      const fromMatch = String(env.emailFrom).match(/^(.*?)\s*<([^>]+)>$/);
      const from = fromMatch
        ? { name: fromMatch[1].trim(), email: fromMatch[2].trim() }
        : { email: env.emailFrom };
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.sendgridApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email }] }],
          from,
          subject,
          content: [{ type: "text/html", value: html }],
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw Object.assign(new Error(payload.errors?.[0]?.message || "SendGrid rejected OTP delivery."), { statusCode: 502, provider: "sendgrid" });
      }
      return { delivered: true, provider: "sendgrid", messageId: response.headers.get("x-message-id") };
    }

    if (env.nodeEnv !== "production" && selectedProvider === "console") {
      console.info("CODRAI OTP", { email, code, purpose, expiresInMinutes });
      return { delivered: true, provider: "console", developmentCode: code };
    }

    throw Object.assign(new Error(`Email OTP provider '${selectedProvider}' is unavailable.`), { statusCode: 503, provider: selectedProvider });
  }
}
