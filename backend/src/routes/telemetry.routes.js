import { Router } from "express";
import { listTelemetry, prometheusMetrics, recordTelemetry, telemetrySummary } from "../controllers/telemetry.controller.js";

const router = Router();

router.get("/", listTelemetry);
router.post("/", recordTelemetry);
router.get("/summary", telemetrySummary);
router.get("/metrics", prometheusMetrics);

export default router;
