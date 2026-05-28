import { Router } from "express";
import { createTeam, listTeams, sendTeamMessage } from "../controllers/team.controller.js";

const router = Router();

router.get("/", listTeams);
router.post("/", createTeam);
router.post("/:teamId/messages", sendTeamMessage);

export default router;
