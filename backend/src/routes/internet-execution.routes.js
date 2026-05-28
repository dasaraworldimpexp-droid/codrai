import { Router } from "express";
import { getInternetExecution, listInternetExecutions, replayInternetExecution, startInternetExecution } from "../controllers/internet-execution.controller.js";

const router = Router();

router.get("/sessions", listInternetExecutions);
router.post("/sessions", startInternetExecution);
router.get("/sessions/:sessionId", getInternetExecution);
router.post("/sessions/:sessionId/replay", replayInternetExecution);

export default router;
