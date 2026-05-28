import { Router } from "express";
import { openSourceGpuStatus, openSourceRuntimeStatus, pullOpenSourceModel } from "../controllers/open-source-runtime.controller.js";

const router = Router();

router.get("/status", openSourceRuntimeStatus);
router.get("/gpu", openSourceGpuStatus);
router.post("/models/pull", pullOpenSourceModel);

export default router;
