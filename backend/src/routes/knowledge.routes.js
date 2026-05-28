import { Router } from "express";
import { ingestUrl, listKnowledgeSources, rankKnowledgeSources } from "../controllers/knowledge.controller.js";

const router = Router();

router.get("/sources", listKnowledgeSources);
router.get("/sources/ranked", rankKnowledgeSources);
router.post("/sources/url", ingestUrl);

export default router;
