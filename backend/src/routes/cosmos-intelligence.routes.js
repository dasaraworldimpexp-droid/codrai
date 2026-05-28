import { Router } from "express";
import {
  cosmosAnalytics,
  cosmosTopology,
  createCosmosUniverse,
  evolveCosmosPolicy,
  forecastCosmosRisk,
  generateSyntheticCivilization,
  mutateCosmosInfrastructure,
  optimizeCosmosResearch,
  sendCosmosDiplomacy,
  simulateCosmosUniverse,
  synthesizeCosmosKnowledge,
} from "../controllers/cosmos-intelligence.controller.js";

const router = Router();

router.get("/topology", cosmosTopology);
router.get("/analytics", cosmosAnalytics);
router.post("/universes", createCosmosUniverse);
router.post("/universes/:universeId/civilizations", generateSyntheticCivilization);
router.post("/universes/:universeId/simulations", simulateCosmosUniverse);
router.post("/universes/:universeId/research", optimizeCosmosResearch);
router.post("/universes/:universeId/memory", synthesizeCosmosKnowledge);
router.post("/universes/:universeId/policies", evolveCosmosPolicy);
router.post("/universes/:universeId/risks", forecastCosmosRisk);
router.post("/universes/:universeId/mutations", mutateCosmosInfrastructure);
router.post("/universes/:universeId/diplomacy", sendCosmosDiplomacy);

export default router;
