import { Router } from "express";
import { createDynamicTool, listDynamicTools } from "../controllers/dynamic-tool.controller.js";

const router = Router();

router.get("/", listDynamicTools);
router.post("/", createDynamicTool);

export default router;
