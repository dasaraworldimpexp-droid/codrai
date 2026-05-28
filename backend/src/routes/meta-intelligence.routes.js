import { Router } from "express";
import {
  createEconomyExchange,
  createMetaCore,
  metaObservability,
  metaTopology,
  proposeRuntimeGenome,
  reflectMetaCore,
  recordMemory,
  registerPlanetaryNode,
  startResearch,
} from "../controllers/meta-intelligence.controller.js";

const router = Router();

router.get("/topology", metaTopology);
router.get("/observability", metaObservability);
router.post("/cores", createMetaCore);
router.get("/cores/:metaCoreId/topology", metaTopology);
router.get("/cores/:metaCoreId/observability", metaObservability);
router.post("/cores/:metaCoreId/reflect", reflectMetaCore);
router.post("/cores/:metaCoreId/planetary-nodes", registerPlanetaryNode);
router.post("/cores/:metaCoreId/runtime-genomes", proposeRuntimeGenome);
router.post("/cores/:metaCoreId/memories", recordMemory);
router.post("/cores/:metaCoreId/economy/exchanges", createEconomyExchange);
router.post("/cores/:metaCoreId/research", startResearch);

export default router;
