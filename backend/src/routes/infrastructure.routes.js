import { Router } from "express";
import { activateInfrastructure, infrastructureStatus, recoverInfrastructure } from "../controllers/infrastructure.controller.js";

const router = Router();

router.get("/status", infrastructureStatus);
router.post("/activate", activateInfrastructure);
router.post("/recover", recoverInfrastructure);

export default router;
