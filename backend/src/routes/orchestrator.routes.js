import { Router } from "express";
import { cancelRun, getRun, listRuns, resumeRun, startRun } from "../controllers/orchestrator.controller.js";

const router = Router();

router.get("/runs", listRuns);
router.post("/runs", startRun);
router.get("/runs/:runId", getRun);
router.post("/runs/:runId/resume", resumeRun);
router.post("/runs/:runId/cancel", cancelRun);

export default router;
