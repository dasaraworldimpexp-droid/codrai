import { Router } from "express";
import {
  createFederation,
  deploymentReadiness,
  federationTopology,
  listFederations,
  openFederationConsensus,
  registerFederationNode,
  routeFederationWorkload,
  superviseFederation,
  syncCognition,
} from "../controllers/federation.controller.js";

const router = Router();

router.get("/", listFederations);
router.post("/", createFederation);
router.get("/topology", federationTopology);
router.post("/deployment/readiness", deploymentReadiness);
router.post("/:federationId/nodes", registerFederationNode);
router.get("/:federationId/topology", federationTopology);
router.post("/:federationId/cognition/sync", syncCognition);
router.post("/:federationId/workloads/route", routeFederationWorkload);
router.post("/:federationId/consensus", openFederationConsensus);
router.post("/:federationId/supervise", superviseFederation);
router.post("/:federationId/deployment/readiness", deploymentReadiness);

export default router;
