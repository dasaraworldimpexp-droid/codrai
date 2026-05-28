import { Router } from "express";
import { listMissions, missionGraph, pauseMission, replayMission, resumeMission, startMission } from "../controllers/mission.controller.js";

const router = Router();

router.get("/", listMissions);
router.get("/graph", missionGraph);
router.post("/", startMission);
router.post("/:missionId/pause", pauseMission);
router.post("/:missionId/resume", resumeMission);
router.post("/:missionId/replay", replayMission);

export default router;
