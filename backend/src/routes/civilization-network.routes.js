import { Router } from "express";
import {
  arbitrateEconomy,
  civilizationNetworkTopology,
  civilizationObservability,
  createCivilizationNetwork,
  createEconomyContract,
  proposeKernelMutation,
  recordGovernanceDecision,
  runRecursiveEvolution,
  transitionCivilizationLifecycle,
} from "../controllers/civilization-network.controller.js";

const router = Router();

router.get("/topology", civilizationNetworkTopology);
router.post("/", createCivilizationNetwork);
router.get("/observability", civilizationObservability);
router.get("/:civilizationId/topology", civilizationNetworkTopology);
router.get("/:civilizationId/observability", civilizationObservability);
router.post("/:civilizationId/lifecycle", transitionCivilizationLifecycle);
router.post("/:civilizationId/evolve", runRecursiveEvolution);
router.post("/:civilizationId/economy/contracts", createEconomyContract);
router.post("/:civilizationId/economy/arbitrate", arbitrateEconomy);
router.post("/:civilizationId/governance/decisions", recordGovernanceDecision);
router.post("/:civilizationId/kernel/mutations", proposeKernelMutation);

export default router;
