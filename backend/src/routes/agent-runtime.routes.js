import { Router } from "express";
import { agentCatalog, agentRunDag, agentRunReplay, agentRuntimeStatus, listAgentMessages, listAgentRuns, startAgentRun } from "../controllers/agent-runtime.controller.js";

const router = Router();

router.post("/runs", startAgentRun);
router.get("/runs", listAgentRuns);
router.get("/runs/:runId/dag", agentRunDag);
router.get("/runs/:runId/replay", agentRunReplay);
router.get("/runs/:runId/messages", listAgentMessages);
router.get("/catalog", agentCatalog);
router.get("/status", agentRuntimeStatus);

export default router;
