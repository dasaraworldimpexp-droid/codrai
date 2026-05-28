import { Router } from "express";
import { heartbeat, listNodes, runtimeGraph } from "../controllers/distributed-runtime.controller.js";

const router = Router();

router.get("/nodes", listNodes);
router.post("/nodes/heartbeat", heartbeat);
router.get("/graph", runtimeGraph);

export default router;
