import { Router } from "express";
import { installExtension, listExtensions, listInstallations, reviewExtension } from "../controllers/marketplace.controller.js";

const router = Router();

router.get("/extensions", listExtensions);
router.get("/installations", listInstallations);
router.post("/extensions/install", installExtension);
router.post("/extensions/:extensionId/reviews", reviewExtension);

export default router;
