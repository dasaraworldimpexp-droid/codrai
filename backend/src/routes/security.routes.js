import { Router } from "express";
import { getTrustReport } from "../controllers/security.controller.js";

const router = Router();

router.get("/trust-report", getTrustReport);

export default router;
