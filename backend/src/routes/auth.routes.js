import { Router } from "express";
import rateLimit from "express-rate-limit";
import { forgotPassword, login, logout, me, refresh, resetPassword, signup, verifyEmail } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

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

router.post("/signup", authMutationLimiter, signup);
router.post("/login", authMutationLimiter, login);
router.post("/refresh", authMutationLimiter, refresh);
router.post("/logout", requireAuth, logout);
router.post("/forgot-password", authRecoveryLimiter, forgotPassword);
router.post("/reset-password", authRecoveryLimiter, resetPassword);
router.post("/verify-email", authRecoveryLimiter, verifyEmail);
router.get("/me", requireAuth, me);

export default router;
