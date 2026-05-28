import { Router } from "express";
import { aiExecutionAnalytics, modelRoutingAnalytics, usageAnalytics } from "../controllers/analytics.controller.js";

const router = Router();

router.get("/usage", usageAnalytics);
router.get("/model-routing", modelRoutingAnalytics);
router.get("/ai-runtime", aiExecutionAnalytics);

export default router;
