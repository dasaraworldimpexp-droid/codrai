import { Router } from "express";
import { listActivity, recordActivity } from "../controllers/activity.controller.js";

const router = Router();

router.get("/", listActivity);
router.post("/", recordActivity);

export default router;
