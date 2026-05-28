import { Router } from "express";
import { listAutonomousCycles, startAutonomousCycle } from "../controllers/autonomous-cycle.controller.js";

const router = Router();

router.get("/", listAutonomousCycles);
router.post("/", startAutonomousCycle);

export default router;
