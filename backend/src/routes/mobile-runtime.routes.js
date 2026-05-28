import { Router } from "express";
import { mobilePushAdapters, mobileRuntimeStatus, queueMobileNotification, queueMobileSync } from "../controllers/mobile-runtime.controller.js";

const router = Router();

router.get("/runtime", mobileRuntimeStatus);
router.get("/push-adapters", mobilePushAdapters);
router.post("/sync", queueMobileSync);
router.post("/notifications", queueMobileNotification);

export default router;
