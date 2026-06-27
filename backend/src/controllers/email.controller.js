import { z } from "zod";
import { sendEmail } from "../services/email.service.js";

const testEmailSchema = z.object({
  to: z.union([
    z.string().trim().email(),
    z.array(z.string().trim().email()).min(1).max(10),
  ]),
  subject: z.string().trim().min(1).max(200),
  html: z.string().trim().min(1).max(200_000),
});

export async function testEmail(req, res) {
  const parsed = testEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid email test payload.",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const result = await sendEmail(parsed.data);
    return res.status(200).json({
      success: true,
      message: "Test email sent successfully.",
      provider: result.provider,
      messageId: result.messageId,
    });
  } catch (error) {
    return res.status(Number(error.statusCode) || 502).json({
      success: false,
      message: error.message || "Test email delivery failed.",
      code: error.code || "EMAIL_DELIVERY_FAILED",
    });
  }
}
