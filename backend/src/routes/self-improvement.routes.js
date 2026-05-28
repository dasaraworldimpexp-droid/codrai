import { Router } from "express";
import { analyzeSelfImprovement, listSelfImprovementProposals, listSelfImprovementRuns } from "../controllers/self-improvement.controller.js";

const router = Router();

router.get("/runs", listSelfImprovementRuns);
router.post("/runs", analyzeSelfImprovement);
router.get("/proposals", listSelfImprovementProposals);

export default router;
