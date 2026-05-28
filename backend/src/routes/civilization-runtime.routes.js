import { Router } from "express";
import {
  allocateCivilizationResources,
  civilizationTopology,
  createCivilizationIdentity,
  evolveCivilization,
  generateCivilizationMission,
  learnCivilizationMemory,
  listCivilizationIdentities,
  planCivilizationStrategy,
  predictCivilizationScaling,
  proposeCivilizationPolicy,
  runCivilizationDiagnostics,
  synthesizeCivilizationTool,
} from "../controllers/civilization-runtime.controller.js";

const router = Router();

router.get("/identities", listCivilizationIdentities);
router.post("/identities", createCivilizationIdentity);
router.post("/memories", learnCivilizationMemory);
router.get("/topology", civilizationTopology);
router.post("/strategy", planCivilizationStrategy);
router.post("/evolve", evolveCivilization);
router.post("/tools/synthesize", synthesizeCivilizationTool);
router.post("/missions/generate", generateCivilizationMission);
router.post("/governance/policies", proposeCivilizationPolicy);
router.post("/economy/allocate", allocateCivilizationResources);
router.get("/diagnostics", runCivilizationDiagnostics);
router.post("/diagnostics", runCivilizationDiagnostics);
router.post("/scaling/predict", predictCivilizationScaling);

export default router;
