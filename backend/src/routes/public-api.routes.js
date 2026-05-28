import { Router } from "express";
import rateLimit from "express-rate-limit";
import { publicApiHealth, publicChatCompletions, publicChatStream, publicModels, publicProviders, publicUsage } from "../controllers/public-api.controller.js";
import { enforceDeveloperQuota, requireDeveloperApiKey } from "../middleware/developer-api-auth.middleware.js";

const router = Router();
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.PUBLIC_API_RATE_LIMIT_PER_MINUTE || 120),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: "CODRAI public API rate limit exceeded.", type: "rate_limit_error", code: "rate_limit_exceeded" } },
});

router.use(apiLimiter);
router.get("/health", requireDeveloperApiKey(["models:read"]), enforceDeveloperQuota(), publicApiHealth);
router.get("/models", requireDeveloperApiKey(["models:read"]), enforceDeveloperQuota(), publicModels);
router.get("/providers", requireDeveloperApiKey(["models:read"]), enforceDeveloperQuota(), publicProviders);
router.get("/usage", requireDeveloperApiKey(["analytics:read"]), enforceDeveloperQuota(), publicUsage);
router.post("/chat/completions", requireDeveloperApiKey(["chat:write"]), enforceDeveloperQuota(), publicChatCompletions);
router.post("/chat/stream", requireDeveloperApiKey(["stream:write"]), enforceDeveloperQuota(), publicChatStream);

export default router;
