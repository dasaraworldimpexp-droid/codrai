import { Router } from "express";
import { listComputerUseSessions, replayComputerUseSession, runComputerUse } from "../controllers/computer-use.controller.js";

const router = Router();

router.get("/sessions", listComputerUseSessions);
router.get("/sessions/:sessionId/replay", replayComputerUseSession);
router.post("/sessions", runComputerUse);

export default router;
