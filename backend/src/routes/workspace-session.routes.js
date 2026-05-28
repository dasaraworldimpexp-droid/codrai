import { Router } from "express";
import { getWorkspaceSession, patchWorkspaceSession } from "../controllers/workspace-session.controller.js";

const router = Router();

router.get("/session", getWorkspaceSession);
router.patch("/session", patchWorkspaceSession);

export default router;
