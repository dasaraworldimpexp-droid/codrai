import { Router } from "express";
import { getWorkflowRun, listWorkflows, saveWorkflow, startSavedWorkflowRun, startWorkflowRun } from "../controllers/workflow.controller.js";

const router = Router();

router.post("/runs", startWorkflowRun);
router.get("/runs/:runId", getWorkflowRun);
router.get("/", listWorkflows);
router.post("/", saveWorkflow);
router.post("/:workflowId/runs", startSavedWorkflowRun);

export default router;
