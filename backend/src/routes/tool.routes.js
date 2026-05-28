import { Router } from "express";
import { cancelToolExecution, executeTool, listTools } from "../controllers/tool.controller.js";

const router = Router();

router.get("/", listTools);
router.post("/executions", executeTool);
router.post("/executions/:executionId/cancel", cancelToolExecution);

export default router;
