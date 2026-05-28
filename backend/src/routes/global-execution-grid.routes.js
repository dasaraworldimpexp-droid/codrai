import { Router } from "express";
import {
  auditGrid,
  gridContainerStatus,
  gridStatus,
  gridTopology,
  recoverGrid,
  registerGridWorker,
  routeGridWorkload,
  syncGridMemory,
} from "../controllers/global-execution-grid.controller.js";

const router = Router();

router.get("/status", gridStatus);
router.get("/topology", gridTopology);
router.get("/containers/status", gridContainerStatus);
router.post("/workers/register", registerGridWorker);
router.post("/workloads/route", routeGridWorkload);
router.post("/recover", recoverGrid);
router.post("/containers/status", gridContainerStatus);
router.post("/memory/sync", syncGridMemory);
router.post("/security/audit", auditGrid);

export default router;
