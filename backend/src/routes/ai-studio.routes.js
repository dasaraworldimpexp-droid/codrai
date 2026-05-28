import { Router } from "express";
import { aiStudioReadiness, aiStudioTemplates, createAiStudioMediaJob, getAiStudioMediaJob, listAiStudioMediaJobs } from "../controllers/ai-studio.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.get("/readiness", aiStudioReadiness);
router.get("/templates", aiStudioTemplates);
router.get("/media/jobs", listAiStudioMediaJobs);
router.post("/media/jobs", createAiStudioMediaJob);
router.get("/media/jobs/:jobId", getAiStudioMediaJob);

export default router;
