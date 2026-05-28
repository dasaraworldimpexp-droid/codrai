import { Router } from "express";
import {
  activateProduction,
  createCheckpoint,
  coordinateRuntime,
  evaluateScaling,
  evolveRuntime,
  hardenSecurity,
  lifecycleAction,
  orchestrationMetrics,
  productionStatus,
  recoverProduction,
  scheduleWorkerTask,
  verifyProduction,
} from "../controllers/production-intelligence.controller.js";

const router = Router();

router.get("/status", productionStatus);
router.get("/verify", verifyProduction);
router.get("/scaling", evaluateScaling);
router.get("/orchestration/metrics", orchestrationMetrics);
router.post("/activate", activateProduction);
router.post("/evolve", evolveRuntime);
router.post("/checkpoints", createCheckpoint);
router.post("/recover", recoverProduction);
router.post("/security/harden", hardenSecurity);
router.post("/lifecycle/:serviceName/:action", lifecycleAction);
router.post("/orchestration/coordinate", coordinateRuntime);
router.post("/orchestration/workers/schedule", scheduleWorkerTask);

export default router;
