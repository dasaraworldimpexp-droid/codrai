import { Router } from "express";
import { executeBrainOperation, getBrainCapabilities } from "../controllers/brain.controller.js";

const router = Router();

router.get("/capabilities", getBrainCapabilities);
router.post("/execute", executeBrainOperation);

export default router;
