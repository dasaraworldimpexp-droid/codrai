import { Router } from "express";
import { listCreationEngines, startCreation } from "../controllers/creation.controller.js";

const router = Router();

router.get("/engines", listCreationEngines);
router.post("/runs", startCreation);

export default router;
