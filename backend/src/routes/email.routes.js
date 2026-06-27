import { Router } from "express";
import rateLimit from "express-rate-limit";
import { testEmail } from "../controllers/email.controller.js";
import { requireRole } from "../middleware/auth.middleware.js";

const router = Router();
const testEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many test email requests. Please retry later.",
  },
});

router.post("/test-email", requireRole(["admin", "owner"]), testEmailLimiter, testEmail);

export default router;
