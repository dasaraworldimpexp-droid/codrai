import { Router } from "express";
import {
  commandDistributedTask,
  distributedExecutionAnalytics,
  distributedTaskReplay,
  distributedTaskTimeline,
  executeDistributedTask,
  getDistributedTask,
  listDistributedTasks,
  recoverDistributedTasks,
  runtimeScalingDecision,
  scheduleDistributedTask,
} from "../controllers/distributed-execution.controller.js";

const router = Router();

router.get("/tasks", listDistributedTasks);
router.post("/tasks", scheduleDistributedTask);
router.get("/tasks/:taskId", getDistributedTask);
router.post("/tasks/:taskId/execute", executeDistributedTask);
router.post("/tasks/:taskId/command", commandDistributedTask);
router.get("/tasks/:taskId/timeline", distributedTaskTimeline);
router.get("/tasks/:taskId/replay", distributedTaskReplay);
router.post("/recover", recoverDistributedTasks);
router.get("/analytics", distributedExecutionAnalytics);
router.post("/scaling/decision", runtimeScalingDecision);

export default router;
