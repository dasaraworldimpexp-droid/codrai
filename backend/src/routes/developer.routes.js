import { Router } from "express";
import rateLimit from "express-rate-limit";
import { createDeveloperApiKey, developerDocs, developerUsage, listDeveloperApiKeys, revokeDeveloperApiKey, rotateDeveloperApiKey } from "../controllers/developer.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();
const developerLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Developer console requests are being rate limited. Please retry shortly." },
});

router.use(requireAuth, developerLimiter);
router.get("/api-keys", listDeveloperApiKeys);
router.post("/api-keys", createDeveloperApiKey);
router.post("/api-keys/:keyId/rotate", rotateDeveloperApiKey);
router.delete("/api-keys/:keyId", revokeDeveloperApiKey);
router.get("/usage", developerUsage);
router.get("/logs", developerUsage);
router.get("/docs", developerDocs);

export default router;
