import { Router } from "express";
import { analyzeHealing, listHealingReports } from "../controllers/self-healing.controller.js";

const router = Router();

router.get("/reports", listHealingReports);
router.post("/reports", analyzeHealing);

export default router;
