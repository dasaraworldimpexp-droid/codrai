import { Router } from "express";
import {
  archiveMemory,
  createMesh,
  fuseCognition,
  generateSpecies,
  governMesh,
  listAsset,
  meshObservability,
  meshTopology,
  routeCognition,
  runScience,
  simulateWorld,
} from "../controllers/superintelligence.controller.js";

const router = Router();

router.get("/topology", meshTopology);
router.get("/observability", meshObservability);
router.post("/meshes", createMesh);
router.get("/meshes/:meshId/topology", meshTopology);
router.get("/meshes/:meshId/observability", meshObservability);
router.post("/meshes/:meshId/fuse", fuseCognition);
router.post("/meshes/:meshId/species", generateSpecies);
router.post("/meshes/:meshId/science", runScience);
router.post("/meshes/:meshId/routes", routeCognition);
router.post("/meshes/:meshId/simulations", simulateWorld);
router.post("/meshes/:meshId/governance", governMesh);
router.post("/meshes/:meshId/memory", archiveMemory);
router.post("/meshes/:meshId/economy/assets", listAsset);

export default router;
