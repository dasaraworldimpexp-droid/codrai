import { Router } from "express";
import {
  createSwarmCluster,
  federateSwarmTask,
  joinSwarmCluster,
  listSwarmClusters,
  migrateSwarmTask,
  negotiateSwarmCapabilities,
  optimizeSwarmCluster,
  proposeSwarmConsensus,
  recoverSwarmCluster,
  replicateSwarmMemory,
  sendSwarmMessage,
  swarmAnalytics,
  swarmEvents,
  swarmTopology,
  voteSwarmConsensus,
} from "../controllers/swarm-runtime.controller.js";

const router = Router();

router.get("/clusters", listSwarmClusters);
router.post("/clusters", createSwarmCluster);
router.get("/clusters/:clusterId/topology", swarmTopology);
router.post("/clusters/:clusterId/join", joinSwarmCluster);
router.post("/clusters/:clusterId/negotiate", negotiateSwarmCapabilities);
router.post("/clusters/:clusterId/messages", sendSwarmMessage);
router.post("/clusters/:clusterId/consensus", proposeSwarmConsensus);
router.post("/consensus/:consensusId/vote", voteSwarmConsensus);
router.post("/clusters/:clusterId/federate", federateSwarmTask);
router.post("/clusters/:clusterId/migrate", migrateSwarmTask);
router.post("/clusters/:clusterId/replicate-memory", replicateSwarmMemory);
router.post("/clusters/:clusterId/recover", recoverSwarmCluster);
router.post("/clusters/:clusterId/optimize", optimizeSwarmCluster);
router.get("/clusters/:clusterId/analytics", swarmAnalytics);
router.get("/clusters/:clusterId/events", swarmEvents);

export default router;
