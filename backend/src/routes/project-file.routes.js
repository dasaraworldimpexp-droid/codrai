import { Router } from "express";
import { exportProject, getProjectFile, listProjectFiles } from "../controllers/project-file.controller.js";

const router = Router();

router.get("/:projectId/files", listProjectFiles);
router.get("/:projectId/file", getProjectFile);
router.get("/:projectId/export", exportProject);

export default router;
