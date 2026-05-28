import { Router } from "express";
import {
  createDeploymentPlan,
  createDeploymentSnapshot,
  deploymentReplayHistory,
  deploymentTemplates,
  diagnostics,
  executeDeploymentPlan,
  healthCheckDeploymentPlan,
  infrastructureStatus,
  listDeploymentPlans,
  listDeploymentSnapshots,
  productionReadiness,
  recoverInfrastructure,
  rollbackDeploymentSnapshot,
  verifyInfrastructure,
} from "../controllers/deployment.controller.js";

const router = Router();

router.get("/diagnostics", diagnostics);
router.get("/production-readiness", productionReadiness);
router.get("/infrastructure/status", infrastructureStatus);
router.post("/infrastructure/recover", recoverInfrastructure);
router.get("/infrastructure/verify", verifyInfrastructure);
router.get("/plans", listDeploymentPlans);
router.get("/replay", deploymentReplayHistory);
router.get("/templates", deploymentTemplates);
router.post("/plans", createDeploymentPlan);
router.post("/plans/:planId/execute", executeDeploymentPlan);
router.post("/plans/:planId/health-check", healthCheckDeploymentPlan);
router.get("/plans/:planId/snapshots", listDeploymentSnapshots);
router.post("/plans/:planId/snapshots", createDeploymentSnapshot);
router.post("/plans/:planId/rollback", rollbackDeploymentSnapshot);

export default router;
