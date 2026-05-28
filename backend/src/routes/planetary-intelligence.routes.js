import { Router } from "express";
import {
  detectPlanetaryAnomalies,
  forecastPlanetaryCivilization,
  generatePlanetaryWorldModel,
  listPlanetaryCapability,
  mutationTestPlanetaryRuntime,
  planetaryAnalytics,
  planetaryTopology,
  rankPlanetaryIntelligence,
  replicatePlanetaryRuntime,
  startPlanetaryResearch,
} from "../controllers/planetary-intelligence.controller.js";

const router = Router();

router.get("/topology", planetaryTopology);
router.get("/analytics", planetaryAnalytics);
router.post("/research", startPlanetaryResearch);
router.post("/world-models", generatePlanetaryWorldModel);
router.post("/forecasts", forecastPlanetaryCivilization);
router.post("/anomalies/detect", detectPlanetaryAnomalies);
router.post("/rankings", rankPlanetaryIntelligence);
router.post("/capabilities", listPlanetaryCapability);
router.post("/replications", replicatePlanetaryRuntime);
router.post("/mutation-tests", mutationTestPlanetaryRuntime);

export default router;
