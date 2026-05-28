import { Router } from "express";
import rateLimit from "express-rate-limit";
import { deleteProviderSetting, listProviderSettings, listProviders, liveProviderExecution, providerHealthDashboard, providerOrchestration, saveProviderSetting, validateProviders } from "../controllers/provider.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();
const providerValidationLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Provider validation is being rate limited. Please retry shortly." },
});
const providerSettingsLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Provider settings updates are being rate limited. Please retry shortly." },
});

router.get("/", listProviders);
router.get("/health", providerHealthDashboard);
router.get("/orchestration", providerOrchestration);
router.post("/live-execute", providerValidationLimiter, liveProviderExecution);
router.post("/validate", providerValidationLimiter, validateProviders);
router.get("/settings", requireAuth, listProviderSettings);
router.put("/settings/:providerName", requireAuth, providerSettingsLimiter, saveProviderSetting);
router.delete("/settings/:providerName", requireAuth, providerSettingsLimiter, deleteProviderSetting);

export default router;
