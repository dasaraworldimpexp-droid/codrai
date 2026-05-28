import { Router } from "express";
import { startAutonomousGoal } from "../controllers/autonomy.controller.js";

const router = Router();

router.post("/goals", startAutonomousGoal);

export default router;
