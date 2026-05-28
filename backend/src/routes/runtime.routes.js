import { Router } from "express";
import { executeRuntimeTask, streamRuntimeTask } from "../controllers/runtime.controller.js";
import {
  registerRuntimeWorker,
  runtimeContainerLifecycle,
  runtimeContainers,
  runtimeCluster,
  runtimeCpuTelemetry,
  runtimeDiagnostics,
  runtimeEnterpriseCompletion,
  runtimeFailover,
  runtimeGpuTelemetry,
  runtimeJobReplay,
  runtimeOperatorConsole,
  runtimeQueues,
  runtimeRecoverStaleExecutions,
  runtimeRecovery,
  runtimeWorkers,
  scheduleRuntimeWorkerTask,
} from "../controllers/runtime-operations.controller.js";

const router = Router();

router.post("/execute", executeRuntimeTask);
router.post("/stream", streamRuntimeTask);
router.get("/workers", runtimeWorkers);
router.post("/workers/register", registerRuntimeWorker);
router.post("/workers/tasks", scheduleRuntimeWorkerTask);
router.get("/diagnostics", runtimeDiagnostics);
router.get("/enterprise-completion", runtimeEnterpriseCompletion);
router.get("/operator-console", runtimeOperatorConsole);
router.get("/containers", runtimeContainers);
router.post("/containers/lifecycle", runtimeContainerLifecycle);
router.get("/queues", runtimeQueues);
router.get("/gpu", runtimeGpuTelemetry);
router.get("/cpu", runtimeCpuTelemetry);
router.get("/cluster", runtimeCluster);
router.get("/jobs/replay", runtimeJobReplay);
router.post("/failover", runtimeFailover);
router.post("/recover", runtimeRecovery);
router.post("/recover/stale-executions", runtimeRecoverStaleExecutions);

export default router;
