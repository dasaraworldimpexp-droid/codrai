import { Router } from "express";
import rateLimit from "express-rate-limit";
import { csrfToken, exportOtpAnalytics, exportUsers, forgotPassword, googleConfig, googleLogin, googleSettings, login, logout, me, refresh, requestOtp, resendOtp, resetPassword, revokeSession, saveGoogleSettings, securityOverview, sendTwilioOtp, signup, testGoogleSettings, userAnalytics, verifyEmail, verifyOtp, verifyTwilioOtp } from "../controllers/auth.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

const router = Router();
const authMutationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Please wait before trying again." },
});
const authRecoveryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many account recovery attempts. Please wait before trying again." },
});
const phoneOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many mobile OTP attempts. Please wait before trying again." },
});

router.post("/signup", authMutationLimiter, signup);
router.post("/login", authMutationLimiter, login);
router.get("/csrf", csrfToken);
router.post("/otp/request", authMutationLimiter, requestOtp);
router.post("/otp/resend", authMutationLimiter, resendOtp);
router.post("/otp/verify", authMutationLimiter, verifyOtp);
router.post("/send-otp", phoneOtpLimiter, sendTwilioOtp);
router.post("/verify-otp", phoneOtpLimiter, verifyTwilioOtp);
router.get("/google/config", googleConfig);
router.post("/google", authMutationLimiter, googleLogin);
router.get("/google/settings", requireRole(["admin"]), googleSettings);
router.put("/google/settings", requireRole(["admin"]), saveGoogleSettings);
router.post("/google/test", requireRole(["admin"]), testGoogleSettings);
router.post("/refresh", authMutationLimiter, refresh);
router.post("/logout", requireAuth, logout);
router.post("/forgot-password", authRecoveryLimiter, forgotPassword);
router.post("/reset-password", authRecoveryLimiter, resetPassword);
router.post("/verify-email", authRecoveryLimiter, verifyEmail);
router.get("/me", requireAuth, me);
router.get("/security", requireAuth, securityOverview);
router.delete("/security/sessions/:sessionId", requireAuth, revokeSession);
router.get("/admin/users/analytics", requireRole(["admin"]), userAnalytics);
router.get("/admin/users/export/:format", requireRole(["admin"]), exportUsers);
router.get("/admin/otp/export/:format", requireRole(["admin"]), exportOtpAnalytics);

export default router;
