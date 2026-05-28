import { Router } from "express";
import { generateApp, listAppGenerations } from "../controllers/app-factory.controller.js";

const router = Router();

router.get("/runs", listAppGenerations);
router.post("/runs", generateApp);

export default router;
